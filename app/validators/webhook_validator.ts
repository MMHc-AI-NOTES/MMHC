import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const webhookValidator = vine.compile(
  vine.object({
    NoteId: vine.string().trim().minLength(1),
    Type: vine.string().trim().minLength(1).optional(),
    ClientId: vine.number().withoutDecimals().optional(),
  })
)

export type webhookValidatorInterface = Infer<typeof webhookValidator>
