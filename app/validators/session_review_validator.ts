import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const invokeSessionReviewValidator = vine.compile(
  vine.object({
    model_id: vine.string().trim(),
    prompt: vine.string().trim(),
    current_note: vine.string().trim(),
    previous_note: vine.string().trim().optional().nullable(),
    temperature: vine.number().optional(),
    top_p: vine.number().nullable().optional(),
    top_k: vine.number().withoutDecimals().nullable().optional(),
  })
)

export type invokeSessionReviewValidatorInterface = Infer<typeof invokeSessionReviewValidator>
