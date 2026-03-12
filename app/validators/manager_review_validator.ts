import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { HumanReviewResultEnum, HumanReviewDecisionEnum } from '#enums/human_review_enum'
import { ManagerReviewDecisionEnum } from '#enums/manager_review_enum'
import { AiStatusEnum, PriorityEnum } from '#enums/session_enum'
import { DisagreementLevelEnum } from '#enums/disagreement_enum'

export const managerReviewIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export type managerReviewIdValidatorInterface = Infer<typeof managerReviewIdValidator>

export const updateManagerReviewValidator = vine.compile(
  vine.object({
    manager_id: vine.number().withoutDecimals().optional(),
    review_id: vine.number().withoutDecimals().optional(),
    note_id: vine.string().trim().minLength(1).optional(),
    chat_id: vine.number().withoutDecimals().optional().nullable(),
    decision: vine
      .number()
      .withoutDecimals()
      .in(Object.values(ManagerReviewDecisionEnum))
      .optional()
      .nullable(),
    practitioner_id: vine.number().withoutDecimals().optional(),
    manual_score: vine.number().optional().nullable(),
    ai_score: vine.number().optional().nullable(),
    disagreement: vine
      .number()
      .withoutDecimals()
      .in(Object.values(DisagreementLevelEnum))
      .optional()
      .nullable(),
    comment: vine.string().trim().optional().nullable(),
    ai_status: vine
      .number()
      .withoutDecimals()
      .in(Object.values(AiStatusEnum))
      .optional()
      .nullable(),
    priority: vine.number().withoutDecimals().in(Object.values(PriorityEnum)).optional().nullable(),
    human_result: vine
      .number()
      .withoutDecimals()
      .in(Object.values(HumanReviewResultEnum))
      .optional()
      .nullable(),
    human_decision: vine
      .number()
      .withoutDecimals()
      .in(Object.values(HumanReviewDecisionEnum))
      .optional()
      .nullable(),
  })
)

export type updateManagerReviewValidatorInterface = Infer<typeof updateManagerReviewValidator>

export const notifyPractitionerValidator = vine.compile(
  vine.object({
    practitioner_id: vine.number().withoutDecimals(),
    note_id: vine.string().trim().minLength(1),
    reviewer_id: vine.number().withoutDecimals(),
    version_id: vine.number().withoutDecimals(),
  })
)

export type notifyPractitionerValidatorInterface = Infer<typeof notifyPractitionerValidator>

export const bulkNotifyPractitionerValidator = vine.compile(
  vine.object({
    manager_review_ids: vine.array(vine.number().withoutDecimals()).minLength(1),
  })
)

export type bulkNotifyPractitionerValidatorInterface = Infer<typeof bulkNotifyPractitionerValidator>
