import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const testChatValidator = vine.compile(
  vine.object({
    prompt: vine.string().trim().minLength(1),
    model_id: vine.string().trim().optional(),
    system_prompt: vine.string().trim().optional(),
    temperature: vine.number().min(0).max(1).optional(),
  })
)

export type testChatValidatorInterface = Infer<typeof testChatValidator>
