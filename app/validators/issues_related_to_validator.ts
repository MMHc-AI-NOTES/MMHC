import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createIssuesRelatedToValidator = vine.compile(
  vine.object({
    field_id: vine.string().trim().minLength(1),
    display_name: vine.string().trim().minLength(1),
  })
)

export const updateIssuesRelatedToValidator = vine.compile(
  vine.object({
    field_id: vine.string().trim().minLength(1).optional(),
    display_name: vine.string().trim().minLength(1).optional(),
  })
)

export type createIssuesRelatedToValidatorInterface = Infer<typeof createIssuesRelatedToValidator>
export type updateIssuesRelatedToValidatorInterface = Infer<typeof updateIssuesRelatedToValidator>
