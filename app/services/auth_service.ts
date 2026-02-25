import User from '#models/user'
import { UserTypeEnum } from '#enums/user_type_enum'
import { registerValidatorInterface } from '#validators/auth_validator'

export const registerUser = async (payload: registerValidatorInterface) => {
  return await User.create(payload)
}

export const loginUser = async (email: string, password: string) => {
  const user = await User.verifyCredentials(email, password)

  if (!user.isActive) {
    throw new Error('Your account is inactive. Please contact administrator.')
  }
  const token = await User.accessTokens.create(user, ['*'])
  return { token, user }
}

/**
 * Impersonate: Super admin credentials + target user email → token for target user (login as that user).
 */
export const impersonateUser = async (
  superAdminEmail: string,
  superAdminPassword: string,
  targetUserEmail: string
) => {
  const superAdmin = await User.verifyCredentials(superAdminEmail, superAdminPassword)

  if (superAdmin.type !== UserTypeEnum.superAdmin) {
    throw new Error('Only super admin can impersonate users.')
  }

  const targetUser = await User.findBy('email', targetUserEmail)
  if (!targetUser) {
    throw new Error('Target user not found.')
  }

  if (!targetUser.isActive) {
    throw new Error('Target user account is inactive.')
  }

  const token = await User.accessTokens.create(targetUser, ['*'])
  return { token, user: targetUser }
}
