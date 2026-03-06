import type { HttpContext } from '@adonisjs/core/http'
import { Secret } from '@adonisjs/core/helpers'
import User from '#models/user'
import {
  registerValidator,
  loginValidator,
  impersonateValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '#validators/auth_validator'
import { loginUser, registerUser, impersonateUser } from '#services/auth_service'
import { requestPasswordReset, resetPassword } from '#services/password_reset_service'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'

export default class AuthController {
  async register(ctx: HttpContext): Promise<void> {
    try {
      const payload = await registerValidator.validate(ctx.request.body())
      const user = await registerUser(payload)
      const { token } = await loginUser(payload.email, payload.password)

      return sendSuccess('User registered successfully', { user, token })
    } catch (error) {
      console.log('Error in register controller', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  async login(ctx: HttpContext): Promise<void> {
    try {
      const { email, password } = await loginValidator.validate(ctx.request.body())

      const { token, user } = await loginUser(email, password)

      return sendSuccess('Logged In Successfully', { token, user })
    } catch (error) {
      console.log('Error in login controller', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  async getUserByToken(ctx: HttpContext): Promise<void> {
    try {
      const user = ctx.auth.getUserOrFail()

      return sendSuccess('User fetched successfully', user)
    } catch (error) {
      console.log('Error in getUserByToken controller', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  async impersonate(ctx: HttpContext): Promise<void> {
    try {
      const payload = await impersonateValidator.validate(ctx.request.body())
      const { token, user } = await impersonateUser(
        payload.email,
        payload.password,
        payload.target_user_email
      )

      return sendSuccess('Impersonation successful', { token, user })
    } catch (error) {
      console.log('Error in impersonate controller', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  async logout(ctx: HttpContext): Promise<void> {
    try {
      const authHeader = ctx.request.header('authorization') || ctx.request.header('Authorization')
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const rawToken = authHeader.slice(7).trim()

        if (rawToken) {
          try {
            const accessToken = await User.accessTokens.verify(new Secret(rawToken))

            if (accessToken) {
              const user = await User.find(accessToken.tokenableId)

              if (user) {
                await User.accessTokens.delete(user, accessToken.identifier)
              }
            }
          } catch {
            // Ignore invalid or already-used token
          }
        }
      }

      return sendSuccess('Logged out successfully')
    } catch (error) {
      console.log('Error in logout controller', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  async forgotPassword(ctx: HttpContext): Promise<void> {
    try {
      const { email } = await forgotPasswordValidator.validate(ctx.request.body())
      const response = await requestPasswordReset(email)

      return response
    } catch (error) {
      console.log('Error in forgotPassword controller', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  async resetPassword(ctx: HttpContext): Promise<void> {
    try {
      const { token, password } = await resetPasswordValidator.validate(ctx.request.body())
      const response = await resetPassword(token, password)
      return response
    } catch (error) {
      console.log('Error in resetPassword controller', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
