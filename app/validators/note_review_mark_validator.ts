import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const markNoteReviewedValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    reviewer_id: vine.number().withoutDecimals().optional(),
    practitioner_id: vine.number().withoutDecimals().optional(),
    marked: vine.boolean(),
  })
)

export type markNoteReviewedValidatorInterface = Infer<typeof markNoteReviewedValidator>
