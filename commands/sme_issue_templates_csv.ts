import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { listSmeIssueTemplates } from '#services/sme_issue_template_service'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import IssuesRelatedTo from '#models/issues_related_to'

const severityOrder = ['minor', 'moderate', 'critical'] as const
const includedSectionNames = [
  'Subjective',
  'Objective',
  'Assessment & Therapeutic Intervention',
  'Reaction to Intervention',
  'Plan and Collaboration',
  'Progress',
  'Therapist Initials',
]

const getDescriptionIdOrder = (value: string | null | undefined): number => {
  if (!value) return Number.MAX_SAFE_INTEGER
  const suffix = String(value).split('_')[1]
  const parsed = Number.parseInt(suffix, 10)
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

export default class SmeIssueTemplatesCsv extends BaseCommand {
  static commandName = 'sme-issue-templates:csv'

  static description = 'Print SME issue templates in grouped file format'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      const response = await listSmeIssueTemplates(1, 10000)
      const rows = response.data || []
      const issuesRelatedTo = await IssuesRelatedTo.query().orderBy('id', 'asc')
      const filteredSections = issuesRelatedTo.filter((section: any) =>
        includedSectionNames.includes(section.displayName)
      )

      const outputChunks = filteredSections.map((section: any, index: number) => {
        const sectionRows = rows.filter((row: any) => row.issuesRelatedToId === section.id)
        const sectionHeader = `${index + 1}. ${section.displayName} (Required)`

        if (sectionRows.length === 0) {
          return sectionHeader
        }

        const severityChunks = severityOrder
          .map((severity) => {
            const severityRows = sectionRows.filter(
              (row: any) => String(row.errorType?.name || '').toLowerCase() === severity
            )

            if (severityRows.length === 0) {
              return null
            }

            severityRows.sort((a: any, b: any) => {
              return getDescriptionIdOrder(a.descriptionId) - getDescriptionIdOrder(b.descriptionId)
            })

            const severityTitle = severityRows[0].errorType?.displayName || severity
            const normalizedSeverityTitle = String(severityTitle).replace(/\)$/, ' each)')
            const issueLines = severityRows.map((row: any) => {
              const description = row.issueDescription?.description || ''
              const descriptionId = row.descriptionId || ''
              return `- ${description}${descriptionId ? ` (${descriptionId})` : ''}`
            })

            return [`${normalizedSeverityTitle}:`, ...issueLines].join('\n')
          })
          .filter(Boolean)

        return [sectionHeader, ...severityChunks].join('\n')
      })

      const csv = outputChunks.join('\n\n')
      const filePath = app.makePath('sme-issue-templates.csv')
      await fs.writeFile(filePath, csv, 'utf8')

      this.logger.success(`CSV file created: ${filePath}`)
      this.logger.log(csv)
    } catch (error: any) {
      this.logger.error('Failed to generate SME issue templates CSV')
      this.logger.fatal(error?.message || String(error))
      process.exit(1)
    }
  }
}
