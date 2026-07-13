import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createChatValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    prompt_id: vine.number().withoutDecimals(),
  })
)

export type createChatValidatorInterface = Infer<typeof createChatValidator>

export const updateChatValidator = vine.compile(
  vine.object({
    prompt: vine.string().trim().optional(),
    user_note: vine.string().trim().optional(),
    model_id: vine.string().trim().optional(),
    evaluation_score: vine.number().optional(),
    sentiment: vine.string().trim().optional(),
    evaluation: vine.string().trim().optional(),
  })
)

export type updateChatValidatorInterface = Infer<typeof updateChatValidator>

export const chatIdValidator = vine.compile(
  vine.object({
    chatId: vine.number().withoutDecimals(),
  })
)

export type chatIdValidatorInterface = Infer<typeof chatIdValidator>

export const updateChatScoreValidator = vine.compile(
  vine.object({
    score: vine.number(),
  })
)

export type updateChatScoreValidatorInterface = Infer<typeof updateChatScoreValidator>
