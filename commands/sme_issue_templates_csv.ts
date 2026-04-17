import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { listSmeIssueTemplates } from '#services/sme_issue_template_service'
import IssuesRelatedTo from '#models/issues_related_to'
const sectionRules = [
  { name: 'Assessment & Therapeutic Intervention', required: true },
  { name: 'Homicidality', required: false },
  { name: 'Mental Status', required: false },
  { name: 'Objective', required: true },
  { name: 'Overall note issue', required: true },
  { name: 'Plan and Collaboration', required: true },
  { name: 'Progress', required: true },
  { name: 'Reaction to Intervention', required: true },
  { name: 'Session Duration', required: true },
  { name: 'Subjective', required: true },
  { name: 'Suicidality', required: false },
  { name: 'Therapist Initials', required: true },
] as const

const sectionRuleMap = new Map(sectionRules.map((rule) => [rule.name, rule.required]))

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
      const filteredSections = issuesRelatedTo
        .filter((section: any) => sectionRuleMap.has(section.displayName))
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName))

      const outputChunks = filteredSections.map((section: any, index: number) => {
        const sectionRows = rows.filter((row: any) => row.issuesRelatedToId === section.id)
        const isRequired = sectionRuleMap.get(section.displayName) === true
        const sectionHeader = isRequired
          ? `${index + 1}. ${section.displayName} (Required)`
          : `${index + 1}. ${section.displayName}`

        if (sectionRows.length === 0) {
          return sectionHeader
        }

        sectionRows.sort((a: any, b: any) => {
          return getDescriptionIdOrder(a.descriptionId) - getDescriptionIdOrder(b.descriptionId)
        })

        const issueLines = sectionRows.map((row: any) => {
          const description = row.issueDescription?.description || ''
          const descriptionId = row.descriptionId || ''
          return `- ${description}${descriptionId ? ` (${descriptionId})` : ''}`
        })

        return [sectionHeader, ...issueLines].join('\n')
      })

      const csv = outputChunks.join('\n\n')
      this.logger.log(csv)
    } catch (error: any) {
      this.logger.error('Failed to generate SME issue templates CSV')
      this.logger.fatal(error?.message || String(error))
      process.exit(1)
    }
  }
}
