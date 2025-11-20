import User from '#models/user'
import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().minLength(3).maxLength(64).trim(),
    email: vine.string().email().trim().unique({
      table: User.table,
      column: 'email',
    }),
    password: vine.string().trim(),
  })
)

export type createUserValidatorInterface = Infer<typeof createUserValidator>

export const updateUserValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .email()
      .trim()
      .unique(async (db, value, field) => {
        const user = await db
          .from(User.table)
          .where('email', value)
          .whereNot('id', field.meta.userId)
          .first()

        // we check if the incoming email is not already exists with other ids, if not exists then we allow to change the email
        return !user
      }),
    fullName: vine.string().minLength(3).maxLength(64).trim(),
    isActive: vine.boolean().optional(),
  })
)
export type updateUserValidatorInterface = Infer<typeof updateUserValidator>

export const userIdValidator = vine.compile(
  vine.object({
    userId: vine.number().positive(),
  })
)
export type userIdValidatorInterface = Infer<typeof userIdValidator>
