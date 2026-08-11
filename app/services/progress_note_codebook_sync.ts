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

export interface CodebookSyncResult {
  created: number
  updated: number
  unchanged: number
  removed: number
  orphansCleaned: number
}

/**
 * Syncs the SME templates for the progress note sections to the finalized
 * codebook in progress_note_codebook.ts.
 *
 * This is deliberately not a deploy seeder. It rewrites template rows,
 * including removing ones the codebook does not list, so it runs only when
 * invoked on purpose through the codebook:sync command, and only applies
 * changes when the apply flag is passed.
 *
 * Sections outside the codebook are never touched.
 */
export async function syncProgressNoteCodebook(
  options: { apply?: boolean } = {}
): Promise<CodebookSyncResult> {
  const apply = options.apply === true

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

  const result: CodebookSyncResult = {
    created: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    orphansCleaned: 0,
  }

  for (const entry of PROGRESS_NOTE_CODEBOOK) {
    const text = entry.description.trim()

    let descriptionRowId = descriptionToId.get(text)
    if (!descriptionRowId) {
      if (apply) {
        const key = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 60)
        const row = await IssueDescription.create({ key, description: text })
        descriptionRowId = row.id
        descriptionToId.set(text, descriptionRowId)
      } else {
        descriptionRowId = -1
      }
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
      if (apply) await SmeIssuesTamplate.create({ ...target, descriptionId: entry.descriptionId })
      result.created++
      continue
    }

    const differs =
      existing.errorTypeId !== target.errorTypeId ||
      existing.issuesRelatedToId !== target.issuesRelatedToId ||
      existing.issueDescriptionId !== target.issueDescriptionId ||
      existing.deletedAt !== null

    if (differs) {
      if (apply) {
        existing.merge({ ...target, deletedAt: null })
        await existing.save()
      }
      result.updated++
    } else {
      result.unchanged++
    }
  }

  const codebookIds = PROGRESS_NOTE_CODEBOOK.map((e) => e.descriptionId)
  const coveredSectionIds = CODEBOOK_SECTIONS.map((name) => sectionToId.get(name)!)

  const removableQuery = SmeIssuesTamplate.query()
    .whereIn('issues_related_to_id', coveredSectionIds)
    .where((query) => {
      query.whereNotIn('description_id', codebookIds).orWhereNull('description_id')
    })

  if (apply) {
    result.removed = Number(await removableQuery.delete())
  } else {
    const removable = await removableQuery
    result.removed = removable.length
  }

  const remainingTemplates = await SmeIssuesTamplate.query().whereNotNull('issue_description_id')
  const referencedByTemplates = remainingTemplates.map((t) => t.issueDescriptionId)
  const referencedBySmeIssues = await db
    .from('sme_issues')
    .whereNotNull('issue_description_id')
    .distinct('issue_description_id')
  const stillReferenced = new Set<number>([
    ...referencedByTemplates.filter((id): id is number => id !== null),
    ...referencedBySmeIssues.map((row) => Number(row.issue_description_id)),
  ])

  const orphanQuery = IssueDescription.query().whereNotIn('id', [...stillReferenced, 0])

  if (apply) {
    result.orphansCleaned = Number(await orphanQuery.delete())
  } else {
    const orphans = await orphanQuery
    result.orphansCleaned = orphans.length
  }

  return result
}
