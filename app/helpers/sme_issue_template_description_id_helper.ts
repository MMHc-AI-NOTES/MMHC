import SmeIssuesTamplate from '#models/sme_issues_tamplate'

export const buildDescriptionPrefix = (displayName: string): string => {
  const firstWord = displayName.trim().split(/\s+/)[0] || 'tmp'
  const normalized = firstWord.toLowerCase().replace(/[^a-z]/g, '')
  return (normalized.slice(0, 3) || 'tmp').padEnd(3, 'x')
}

const getNumericSuffix = (value: string | null | undefined): number => {
  if (!value) return Number.MAX_SAFE_INTEGER
  const suffix = String(value).split('_')[1]
  const parsed = Number.parseInt(suffix, 10)
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

export const getNextDescriptionId = async (issuesRelatedToDisplayName: string): Promise<string> => {
  const prefix = buildDescriptionPrefix(issuesRelatedToDisplayName)
  const existingTemplates = await SmeIssuesTamplate.query()
    .where('description_id', 'like', `${prefix}_%`)
    .select('description_id')

  let maxNumber = 0
  existingTemplates.forEach((template: any) => {
    const parsed = getNumericSuffix(template.descriptionId)
    if (parsed !== Number.MAX_SAFE_INTEGER && parsed > maxNumber) {
      maxNumber = parsed
    }
  })

  return `${prefix}_${maxNumber + 1}`
}

// An issue code is a permanent identifier shared with the AI scorer: findings
// arrive tagged with it, so a code must never be reassigned to a different
// template. Deleting a template leaves a gap in the numbering on purpose. The
// old resequencing that renumbered a section after a delete or a move would
// silently repoint the scorer's codes at different labels.
