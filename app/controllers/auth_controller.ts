import type { HttpContext } from '@adonisjs/core/http'
import { registerValidator, loginValidator, impersonateValidator } from '#validators/auth_validator'
import { loginUser, registerUser, impersonateUser } from '#services/auth_service'
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
}
