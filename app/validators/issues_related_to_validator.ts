import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { SECTION_NOTE_TYPES } from '#services/annotatable_sections'

export const createIssuesRelatedToValidator = vine.compile(
  vine.object({
    field_id: vine.string().trim().minLength(1),
    display_name: vine.string().trim().minLength(1),
    note_type: vine.enum(SECTION_NOTE_TYPES).optional(),
  })
)

export const updateIssuesRelatedToValidator = vine.compile(
  vine.object({
    field_id: vine.string().trim().minLength(1).optional(),
    display_name: vine.string().trim().minLength(1).optional(),
    note_type: vine.enum(SECTION_NOTE_TYPES).optional(),
  })
)

export type createIssuesRelatedToValidatorInterface = Infer<typeof createIssuesRelatedToValidator>
export type updateIssuesRelatedToValidatorInterface = Infer<typeof updateIssuesRelatedToValidator>
