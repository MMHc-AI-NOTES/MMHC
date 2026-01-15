import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createIssueDescriptionValidator = vine.compile(
  vine.object({
    key: vine.string().trim().minLength(1),
    description: vine.string().trim().minLength(1),
  })
)

export const updateIssueDescriptionValidator = vine.compile(
  vine.object({
    key: vine.string().trim().minLength(1).optional(),
    description: vine.string().trim().minLength(1).optional(),
  })
)

export type createIssueDescriptionValidatorInterface = Infer<typeof createIssueDescriptionValidator>
export type updateIssueDescriptionValidatorInterface = Infer<typeof updateIssueDescriptionValidator>
