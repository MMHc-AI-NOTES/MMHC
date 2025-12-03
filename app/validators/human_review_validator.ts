import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createHumanReviewValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    decision: vine.number().withoutDecimals(),
    manual_score: vine.number().optional(),
    comment: vine.string().trim().optional(),
  })
)

export type createHumanReviewValidatorInterface = Infer<typeof createHumanReviewValidator>
