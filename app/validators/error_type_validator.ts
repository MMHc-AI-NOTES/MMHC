import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createErrorTypeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1),
    display_name: vine.string().trim().minLength(1),
    points: vine.number().withoutDecimals().positive(),
  })
)

export const updateErrorTypeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).optional(),
    display_name: vine.string().trim().minLength(1).optional(),
    points: vine.number().withoutDecimals().positive().optional(),
  })
)

export type createErrorTypeValidatorInterface = Infer<typeof createErrorTypeValidator>
export type updateErrorTypeValidatorInterface = Infer<typeof updateErrorTypeValidator>
