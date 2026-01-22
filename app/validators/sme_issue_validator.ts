import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createSmeIssueValidator = vine.compile(
  vine.object({
    reviewer_id: vine.number().withoutDecimals(),
    error_type_id: vine.number().withoutDecimals(),
    issues_related_to_id: vine.number().withoutDecimals(),
    issue_description_id: vine.number().withoutDecimals().optional().nullable(),
    note_id: vine.string().trim().minLength(1),
    version_id: vine.number().withoutDecimals().optional().nullable(),
    status: vine.number().withoutDecimals().optional(),
  })
)

export const updateSmeIssueValidator = vine.compile(
  vine.object({
    reviewer_id: vine.number().withoutDecimals().optional(),
    error_type_id: vine.number().withoutDecimals().optional(),
    issues_related_to_id: vine.number().withoutDecimals().optional(),
    issue_description_id: vine.number().withoutDecimals().optional().nullable(),
    note_id: vine.string().trim().minLength(1).optional(),
    version_id: vine.number().withoutDecimals().optional().nullable(),
    status: vine.number().withoutDecimals().optional(),
  })
)

export const deleteSmeIssuesByNoteAndVersionValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    version_id: vine.number().withoutDecimals(),
    reviewer_id: vine.number().withoutDecimals(),
  })
)

export type createSmeIssueValidatorInterface = Infer<typeof createSmeIssueValidator>
export type updateSmeIssueValidatorInterface = Infer<typeof updateSmeIssueValidator>
