import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createSmeIssueTemplateValidator = vine.compile(
  vine.object({
    error_type_id: vine.number().withoutDecimals(),
    issues_related_to_id: vine.number().withoutDecimals(),
    issue_description_id: vine.number().withoutDecimals(),
  })
)

export const updateSmeIssueTemplateValidator = vine.compile(
  vine.object({
    error_type_id: vine.number().withoutDecimals().optional(),
    issues_related_to_id: vine.number().withoutDecimals().optional(),
    issue_description_id: vine.number().withoutDecimals().optional().nullable(),
  })
)

export type createSmeIssueTemplateValidatorInterface = Infer<typeof createSmeIssueTemplateValidator>
export type updateSmeIssueTemplateValidatorInterface = Infer<typeof updateSmeIssueTemplateValidator>
