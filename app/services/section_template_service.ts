import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import ErrorType from '#models/error_type'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import { getNextDescriptionId } from '#helpers/sme_issue_template_description_id_helper'

/**
 * Documentation quality issues that apply to any written section. The section
 * specific ones, such as progress not being supported by the note, are left to
 * the SME team to add where they belong.
 */
export const GENERAL_DESCRIPTION_KEYS = [
  'vague_non_specific_language',
  'templated_boilerplate_language',
  'not_specific_to_date_of_service',
  'no_clinical_interpretation',
  'missing_required_field',
  'identical_duplicate_content_previous_note',
]

export interface SeedTemplatesOptions {
  apply?: boolean
  sectionLike?: string
  onSection?: (displayName: string, count: number) => void
}

export interface SeedTemplatesResult {
  sectionsSeeded: number
  templatesCreated: number
  alreadyConfigured: number
  descriptionsUsed: number
  severity: string | null
}

/**
 * Gives every section that has no templates a starter set, so the plus button
 * has something to offer. Sections that already have templates are left
 * untouched, which makes this safe to run on every deploy.
 */
export async function seedMissingSectionTemplates(
  options: SeedTemplatesOptions = {}
): Promise<SeedTemplatesResult> {
  const empty: SeedTemplatesResult = {
    sectionsSeeded: 0,
    templatesCreated: 0,
    alreadyConfigured: 0,
    descriptionsUsed: 0,
    severity: null,
  }

  const errorType = await ErrorType.findBy('name', 'moderate')
  if (!errorType) return empty

  const descriptions = await IssueDescription.query().whereIn('key', GENERAL_DESCRIPTION_KEYS)
  if (!descriptions.length) return empty

  const sectionQuery = IssuesRelatedTo.query()
  if (options.sectionLike) sectionQuery.where('display_name', 'like', `%${options.sectionLike}%`)
  const sections = await sectionQuery.orderBy('id', 'asc')

  const result: SeedTemplatesResult = {
    ...empty,
    descriptionsUsed: descriptions.length,
    severity: errorType.name,
  }

  for (const section of sections) {
    const existing = await SmeIssuesTamplate.query()
      .where('issues_related_to_id', section.id)
      .whereNull('deleted_at')
      .first()

    if (existing) {
      result.alreadyConfigured++
      continue
    }

    result.sectionsSeeded++
    options.onSection?.(section.displayName, descriptions.length)

    if (!options.apply) {
      result.templatesCreated += descriptions.length
      continue
    }

    for (const description of descriptions) {
      const descriptionId = await getNextDescriptionId(section.displayName)
      await SmeIssuesTamplate.create({
        errorTypeId: errorType.id,
        issuesRelatedToId: section.id,
        issueDescriptionId: description.id,
        descriptionId,
      })
      result.templatesCreated++
    }
  }

  return result
}
