import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createHumanReviewValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    practitioner_id: vine.number().withoutDecimals(),
    decision: vine.number().withoutDecimals(),
    chat_id: vine.number().withoutDecimals().optional(),
    manual_score: vine.number().optional(),
    comment: vine.string().trim().optional(),
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
  })
)

export type updateHumanReviewValidatorInterface = Infer<typeof updateHumanReviewValidator>

export const humanReviewIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export type humanReviewIdValidatorInterface = Infer<typeof humanReviewIdValidator>
