import logger from '@adonisjs/core/services/logger'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import {
  createUser,
  deleteUser,
  getUserById,
  updateUser,
  completeUserOnboarding,
  resendUserOnboardingEmail,
  updateUserPassword,
  userListing,
} from '#services/user_service'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createUserValidator,
  updateUserValidator,
  userIdValidator,
  completeOnboardingValidator,
  updateUserPasswordValidator,
} from '#validators/user_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  public async create(ctx: HttpContext) {
    try {
      const payload = await createUserValidator.validate(ctx.request.body())
      const currentUser = ctx.auth.getUserOrFail()
      const userResponse = await createUser(payload, currentUser.type)
      return sendSuccess('User created successfully', userResponse)
    } catch (error) {
      logger.error('User creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { userId } = await userIdValidator.validate(ctx.params)
      const userResponse = await getUserById(userId)
      return sendSuccess('User details', userResponse)
    } catch (error) {
      logger.error('User getting by id error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { userId } = await userIdValidator.validate(ctx.params)
      const currentUser = ctx.auth.getUserOrFail()

      const payload = await updateUserValidator.validate(ctx.request.body(), {
        meta: { userId: ctx.request.param('userId') },
      })

      // If user is updating their own profile, remove type and email from payload
      if (currentUser.id === userId) {
        delete payload.type
        delete payload.email
      }

      const userResponse = await updateUser(payload, userId)
      return sendSuccess('User updated successfully', userResponse)
    } catch (error) {
      console.error('Error while updating user:', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async delete(ctx: HttpContext) {
    try {
      const { userId } = await userIdValidator.validate(ctx.params)
      await deleteUser(userId)
      return sendSuccess('User deleted successfully')
    } catch (error) {
      logger.error('User deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const userResponse = await userListing(page, pageSize, filters, sorts)
      return sendSuccess('Users listed successfully', userResponse)
    } catch (error) {
      logger.error('User listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async completeOnboarding(ctx: HttpContext) {
    try {
      const payload = await completeOnboardingValidator.validate(ctx.request.body())
      const user = await completeUserOnboarding(payload)
      return sendSuccess('Onboarding completed successfully', user)
    } catch (error) {
      logger.error('Error in completeOnboarding:', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async resendOnboardingEmail(ctx: HttpContext) {
    try {
      const { userId } = await userIdValidator.validate(ctx.params)
      await resendUserOnboardingEmail(userId)
      return sendSuccess('Onboarding email resent successfully')
    } catch (error) {
      logger.error('Error in resendOnboardingEmail:', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async updatePassword(ctx: HttpContext) {
    try {
      const payload = await updateUserPasswordValidator.validate(ctx.request.body())
      const currentUser = ctx.auth.getUserOrFail()
      const user = await updateUserPassword(payload, currentUser.id, currentUser.type)
      return sendSuccess('Password updated successfully', user)
    } catch (error) {
      logger.error('Error in updatePassword:', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
