import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { HumanReviewDecisionEnum } from '#enums/human_review_enum'
import { DisagreementLevelEnum } from '#enums/disagreement_enum'
import { PriorityEnum } from '#enums/session_enum'

export const createSmeIssueValidator = vine.compile(
  vine.object({
    reviewer_id: vine.number().withoutDecimals(),
    practitioner_id: vine.number().withoutDecimals(),
    // New combined template id (optional, but if provided we will use it to resolve the 3 fields below)
    template_id: vine.number().withoutDecimals().optional(),
    error_type_id: vine.number().withoutDecimals().optional(),
    issues_related_to_id: vine.number().withoutDecimals().optional(),
    issue_description_id: vine.number().withoutDecimals().optional().nullable(),
    note_id: vine.string().trim().minLength(1),
    version_id: vine.number().withoutDecimals().optional().nullable(),
    status: vine.number().withoutDecimals().optional(),
    is_current_version: vine.boolean(),
  })
)

export const updateSmeIssueValidator = vine.compile(
  vine.object({
    reviewer_id: vine.number().withoutDecimals().optional(),
    practitioner_id: vine.number().withoutDecimals().optional(),
    template_id: vine.number().withoutDecimals().optional(),
    error_type_id: vine.number().withoutDecimals().optional(),
    issues_related_to_id: vine.number().withoutDecimals().optional(),
    issue_description_id: vine.number().withoutDecimals().optional().nullable(),
    note_id: vine.string().trim().minLength(1).optional(),
    version_id: vine.number().withoutDecimals().optional().nullable(),
    status: vine.number().withoutDecimals().optional(),
    is_current_version: vine.boolean().optional(),
  })
)

export const deleteSmeIssuesByNoteAndVersionValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    version_id: vine.number().withoutDecimals(),
    reviewer_id: vine.number().withoutDecimals(),
  })
)

export const assignSmeIssueToManagerValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    version_id: vine.number().withoutDecimals().nullable(),
    practitioner_id: vine.number().withoutDecimals(),
    ai_score: vine.number().nullable(),
    reviewer_id: vine.number().withoutDecimals(),
    human_decision: vine
      .number()
      .withoutDecimals()
      .in(Object.values(HumanReviewDecisionEnum))
      .optional()
      .nullable(),
    disagreement: vine
      .number()
      .withoutDecimals()
      .in(Object.values(DisagreementLevelEnum))
      .optional()
      .nullable(),
    priority: vine.number().withoutDecimals().in(Object.values(PriorityEnum)).optional().nullable(),
  })
)

export type createSmeIssueValidatorInterface = Infer<typeof createSmeIssueValidator>
export type updateSmeIssueValidatorInterface = Infer<typeof updateSmeIssueValidator>
export type assignSmeIssueToManagerValidatorInterface = Infer<
  typeof assignSmeIssueToManagerValidator
>
