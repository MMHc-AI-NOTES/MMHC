import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const invokeMcpSessionReviewValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
  })
)

export type invokeMcpSessionReviewValidatorInterface = Infer<typeof invokeMcpSessionReviewValidator>
