import User from '#models/user'
import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const registerValidator = vine.compile(
  vine.object({
    fullName: vine.string().minLength(3).maxLength(64),
    email: vine.string().email().trim().unique({
      table: User.table,
      column: 'email',
    }),
    password: vine.string().minLength(8).maxLength(64),
  })
)

registerValidator.messagesProvider = new SimpleMessagesProvider({
  'email.required': 'Email is required',
  'email.database.unique': 'User with email already exists',
})

export type registerValidatorInterface = Infer<typeof registerValidator>

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8).maxLength(64),
  })
)
export type loginValidatorInterface = Infer<typeof loginValidator>

export const impersonateValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8).maxLength(64),
    target_user_email: vine.string().email(),
  })
)
export type impersonateValidatorInterface = Infer<typeof impersonateValidator>
