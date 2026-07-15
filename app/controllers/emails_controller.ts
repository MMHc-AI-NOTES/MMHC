import { sendSuccess } from '#services/custom_response_service'
import { dispatchWelcomeEmail } from '#services/email_service'
import ErrorService from '#services/error_service'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
export default class EmailsController {
  public async welcomeEmail(ctx: HttpContext) {
    try {
      const userResponse = await dispatchWelcomeEmail()
      return sendSuccess('Email send successfully', userResponse)
    } catch (error) {
      logger.error('Email sending error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
