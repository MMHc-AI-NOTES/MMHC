import crypto from 'node:crypto'
import User from '#models/user'
import PasswordReset from '#models/password_reset'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { sendForgotPasswordEmail } from '#services/email_service'
import { appConfig } from '#config/services'

export const requestPasswordReset = async (email: string) => {
  const user = await User.findBy('email', email)

  if (!user) {
    return sendSuccess('User with this email does not exist')
  }

  await PasswordReset.query().where('user_id', user.id).where('is_used', false).update({
    isUsed: true,
  })

  const token = crypto.randomBytes(32).toString('hex')

  await PasswordReset.create({
    userId: user.id,
    token,
    isUsed: false,
  })

  const resetUrl = `${appConfig.frontendUrl}/reset-password?token=${token}`
  await sendForgotPasswordEmail(email, resetUrl)
  return sendSuccess('Reset link has been sent to your email')
}

export const resetPassword = async (token: string, newPassword: string) => {
  const record = await PasswordReset.query().where('token', token).where('is_used', false).first()

  if (!record) {
    return sendError('Invalid or expired reset token')
  }

  const user = await User.find(record.userId)
  if (!user) {
    return sendError('User not found for this token')
  }

  user.password = newPassword
  await user.save()

  record.isUsed = true
  await record.save()

  await PasswordReset.query()
    .where('user_id', record.userId)
    .where('id', '!=', record.id)
    .update({ isUsed: true })

  return sendSuccess('Password reset successfully')
}
