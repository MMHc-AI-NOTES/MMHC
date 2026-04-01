import IssuesRelatedTo from '#models/issues_related_to'
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

export const resequenceDescriptionIds = async (issuesRelatedToId: number) => {
  const issuesRelatedTo = await IssuesRelatedTo.find(issuesRelatedToId)
  if (!issuesRelatedTo) return

  const prefix = buildDescriptionPrefix(issuesRelatedTo.displayName)
  const templates = await SmeIssuesTamplate.query()
    .where('issues_related_to_id', issuesRelatedToId)
    .orderBy('created_at', 'asc')

  templates.sort((a: any, b: any) => {
    const diff = getNumericSuffix(a.descriptionId) - getNumericSuffix(b.descriptionId)
    if (diff !== 0) return diff
    return a.id - b.id
  })

  for (const [index, template] of templates.entries()) {
    const expectedDescriptionId = `${prefix}_${index + 1}`
    if (template.descriptionId !== expectedDescriptionId) {
      template.descriptionId = expectedDescriptionId
      await template.save()
    }
  }
}
