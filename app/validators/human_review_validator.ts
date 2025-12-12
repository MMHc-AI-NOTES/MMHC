import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { HumanReviewResultEnum } from '#enums/human_review_enum'

export const createHumanReviewValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    practitioner_id: vine.number().withoutDecimals(),
    decision: vine.number().withoutDecimals(),
    chat_id: vine.number().withoutDecimals().optional(),
    manual_score: vine.number().optional(),
    comment: vine.string().trim().optional(),
    ai_status: vine.number().withoutDecimals().optional(),
    priority: vine.number().withoutDecimals().optional(),
    human_result: vine
      .number()
      .withoutDecimals()
      .in([HumanReviewResultEnum.pass, HumanReviewResultEnum.fail])
      .optional(),
  })
)

export type createHumanReviewValidatorInterface = Infer<typeof createHumanReviewValidator>

export const updateHumanReviewValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1).optional(),
    practitioner_id: vine.number().withoutDecimals().optional(),
    decision: vine.number().withoutDecimals().optional(),
    chat_id: vine.number().withoutDecimals().optional().nullable(),
    manual_score: vine.number().optional().nullable(),
    comment: vine.string().trim().optional().nullable(),
    ai_status: vine.number().withoutDecimals().optional().nullable(),
    priority: vine.number().withoutDecimals().optional().nullable(),
    human_result: vine
      .number()
      .withoutDecimals()
      .in([HumanReviewResultEnum.pass, HumanReviewResultEnum.fail])
      .optional()
      .nullable(),
  })
)

export type updateHumanReviewValidatorInterface = Infer<typeof updateHumanReviewValidator>

export const humanReviewIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export type humanReviewIdValidatorInterface = Infer<typeof humanReviewIdValidator>
