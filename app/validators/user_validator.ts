import User from '#models/user'
import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { UserTypeEnum } from '#enums/user_type_enum'

export const createUserValidator = vine.compile(
  vine.object({
    full_name: vine.string().minLength(3).maxLength(64).trim(),
    email: vine.string().email().trim().unique({
      table: User.table,
      column: 'email',
    }),
    is_active: vine.boolean().optional(),
    type: vine
      .number()
      .withoutDecimals()
      .in([
        UserTypeEnum.superAdmin,
        UserTypeEnum.user,
        UserTypeEnum.practitioner,
        UserTypeEnum.sme_reviewer,
      ])
      .optional(),
    password: vine.string().trim().optional(),
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
      })
      .optional(),
    full_name: vine.string().minLength(3).maxLength(64).trim().optional(),
    is_active: vine.boolean().optional(),
    type: vine
      .number()
      .withoutDecimals()
      .in([
        UserTypeEnum.superAdmin,
        UserTypeEnum.user,
        UserTypeEnum.practitioner,
        UserTypeEnum.sme_reviewer,
      ])
      .optional(),
  })
)
export type updateUserValidatorInterface = Infer<typeof updateUserValidator>

export const userIdValidator = vine.compile(
  vine.object({
    userId: vine.number().positive(),
  })
)
export type userIdValidatorInterface = Infer<typeof userIdValidator>

export const completeOnboardingValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(1),
    email: vine.string().email().trim(),
    full_name: vine.string().minLength(3).maxLength(64).trim(),
    password: vine.string().trim(),
    is_active: vine.boolean(),
    type: vine
      .number()
      .withoutDecimals()
      .in([
        UserTypeEnum.superAdmin,
        UserTypeEnum.user,
        UserTypeEnum.practitioner,
        UserTypeEnum.sme_reviewer,
      ]),
  })
)
export type completeOnboardingValidatorInterface = Infer<typeof completeOnboardingValidator>
