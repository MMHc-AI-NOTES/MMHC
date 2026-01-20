import User from '#models/user'
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
