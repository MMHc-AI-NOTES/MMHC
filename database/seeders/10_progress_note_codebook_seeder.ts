import { BaseSeeder } from '@adonisjs/lucid/seeders'
import logger from '@adonisjs/core/services/logger'
import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import ErrorType from '#models/error_type'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import db from '@adonisjs/lucid/services/db'
import {
  PROGRESS_NOTE_CODEBOOK,
  CODEBOOK_SECTIONS,
  assertCodebookIsConsistent,
} from '#services/progress_note_codebook'

/**
 * Syncs the SME templates for progress note sections to the client's
 * finalized codebook in progress_note_codebook.ts.
 *
 * Runs on every deploy and is idempotent. The existing notes and reviews are
 * being cleared and re-reviewed under this codebook, so the sync is a clean
 * slate: templates are matched by description_id and updated in place or
 * created, templates in codebook sections that the codebook no longer lists
 * are removed, and description rows that nothing references any more are
 * removed with them.
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
      // removed. The old reviews are being cleared and re-run, so there is
      // nothing left that should resolve against them.
      const codebookIds = PROGRESS_NOTE_CODEBOOK.map((e) => e.descriptionId)
      const coveredSectionIds = CODEBOOK_SECTIONS.map((name) => sectionToId.get(name)!)

      const removedCount = await SmeIssuesTamplate.query()
        .whereIn('issues_related_to_id', coveredSectionIds)
        .where((query) => {
          query.whereNotIn('description_id', codebookIds).orWhereNull('description_id')
        })
        .delete()

      // Description rows nothing references any more go with them, so the
      // Settings screens offer only the codebook's wording.
      const referencedByTemplates = (
        await SmeIssuesTamplate.query().whereNotNull('issue_description_id')
      ).map((t) => t.issueDescriptionId)
      const referencedBySmeIssues = await db
        .from('sme_issues')
        .whereNotNull('issue_description_id')
        .distinct('issue_description_id')
      const stillReferenced = new Set<number>([
        ...referencedByTemplates.filter((id): id is number => id !== null),
        ...referencedBySmeIssues.map((row) => Number(row.issue_description_id)),
      ])

      const orphanCount = await IssueDescription.query()
        .whereNotIn('id', [...stillReferenced, 0])
        .delete()

      logger.info(
        `Codebook sync: ${created} template(s) created, ${updated} updated, ` +
          `${unchanged} already correct, ${Number(removedCount)} removed, ` +
          `${Number(orphanCount)} unused description(s) cleaned`
      )
    } catch (error) {
      logger.error(`Error seeding the progress note codebook: ${error}`)
      throw error
    }
  }
}
