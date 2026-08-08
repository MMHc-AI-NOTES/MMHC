import { BaseSeeder } from '@adonisjs/lucid/seeders'
import logger from '@adonisjs/core/services/logger'
import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import ErrorType from '#models/error_type'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import { DateTime } from 'luxon'
import {
  PROGRESS_NOTE_CODEBOOK,
  CODEBOOK_SECTIONS,
  assertCodebookIsConsistent,
} from '#services/progress_note_codebook'

/**
 * Syncs the SME templates for progress note sections to the client's
 * finalized codebook in progress_note_codebook.ts.
 *
 * Runs on every deploy and is idempotent. Three rules keep it safe:
 *
 * Existing issue description rows are never edited. Historical SME issues
 * reference them, so changing their text would rewrite what a past reviewer
 * said. A codebook description that does not exist verbatim gets a new row.
 *
 * Templates are matched by description_id, which is unique. A matching row is
 * updated in place, a missing one is created, and rows in codebook sections
 * whose id is not in the codebook are soft deleted. Past SME issues carry
 * their own copies of severity and description, so none of this rewrites
 * history.
 *
 * Sections outside the codebook are not touched, so the starter templates on
 * intake, treatment plan and termination stay until their codebooks arrive.
 */
export default class extends BaseSeeder {
  async run() {
    try {
      assertCodebookIsConsistent()

      const errorTypes = await ErrorType.all()
      const severityToId = new Map(errorTypes.map((e) => [e.name, e.id]))
      for (const severity of ['minor', 'moderate', 'critical']) {
        if (!severityToId.has(severity)) throw new Error(`Error type "${severity}" is not seeded`)
      }

      const sections = await IssuesRelatedTo.all()
      const sectionToId = new Map(sections.map((s) => [s.displayName, s.id]))
      for (const name of CODEBOOK_SECTIONS) {
        if (!sectionToId.has(name)) throw new Error(`Section "${name}" is not seeded`)
      }

      const descriptions = await IssueDescription.all()
      const descriptionToId = new Map(descriptions.map((d) => [d.description.trim(), d.id]))

      let created = 0
      let updated = 0
      let unchanged = 0

      for (const entry of PROGRESS_NOTE_CODEBOOK) {
        const text = entry.description.trim()

        let descriptionRowId = descriptionToId.get(text)
        if (!descriptionRowId) {
          const key = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 60)
          const row = await IssueDescription.create({ key, description: text })
          descriptionRowId = row.id
          descriptionToId.set(text, descriptionRowId)
        }

        const target = {
          errorTypeId: severityToId.get(entry.severity)!,
          issuesRelatedToId: sectionToId.get(entry.section)!,
          issueDescriptionId: descriptionRowId,
        }

        const existing = await SmeIssuesTamplate.query()
          .where('description_id', entry.descriptionId)
          .first()

        if (!existing) {
          await SmeIssuesTamplate.create({ ...target, descriptionId: entry.descriptionId })
          created++
          continue
        }

        const differs =
          existing.errorTypeId !== target.errorTypeId ||
          existing.issuesRelatedToId !== target.issuesRelatedToId ||
          existing.issueDescriptionId !== target.issueDescriptionId ||
          existing.deletedAt !== null

        if (differs) {
          existing.merge({ ...target, deletedAt: null })
          await existing.save()
          updated++
        } else {
          unchanged++
        }
      }

      // Templates in codebook sections that the codebook no longer lists are
      // retired. Soft deleted so nothing referencing them breaks.
      const codebookIds = PROGRESS_NOTE_CODEBOOK.map((e) => e.descriptionId)
      const coveredSectionIds = CODEBOOK_SECTIONS.map((name) => sectionToId.get(name)!)

      const retiredCount = await SmeIssuesTamplate.query()
        .whereIn('issues_related_to_id', coveredSectionIds)
        .whereNotIn('description_id', codebookIds)
        .whereNull('deleted_at')
        .update({ deleted_at: DateTime.now().toSQL() })

      logger.info(
        `Codebook sync: ${created} template(s) created, ${updated} updated, ` +
          `${unchanged} already correct, ${Number(retiredCount)} retired`
      )
    } catch (error) {
      logger.error(`Error seeding the progress note codebook: ${error}`)
      throw error
    }
  }
}
