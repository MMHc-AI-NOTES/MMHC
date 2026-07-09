import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createMcpChatValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
  })
)

export type createMcpChatValidatorInterface = Infer<typeof createMcpChatValidator>

export const mcpChatIdValidator = vine.compile(
  vine.object({
    chatId: vine.number().withoutDecimals(),
  })
)

export type mcpChatIdValidatorInterface = Infer<typeof mcpChatIdValidator>
