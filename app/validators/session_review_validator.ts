import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const invokeSessionReviewValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    prompt_id: vine.number().withoutDecimals(),
    /** Optional; same as chat create — falls back to agent.model when omitted. */
    model_id: vine.string().trim().optional(),
    temperature: vine.number().optional(),
    top_p: vine.number().nullable().optional(),
    top_k: vine.number().withoutDecimals().nullable().optional(),
  })
)

export type invokeSessionReviewValidatorInterface = Infer<typeof invokeSessionReviewValidator>
