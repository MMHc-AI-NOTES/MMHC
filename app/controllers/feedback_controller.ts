import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import {
  submitFeedback,
  getFeedbackVerdicts,
  deleteFeedbackVerdict,
} from '#services/feedback_service'
import {
  submitFeedbackValidator,
  feedbackVerdictIdValidator,
  feedbackSessionIdParamsValidator,
} from '#validators/feedback_validator'
import logger from '@adonisjs/core/services/logger'

export default class FeedbackController {
  public async submit(ctx: HttpContext) {
    try {
      logger.info('ctx.request.body()', ctx.request.body())
      const payload = await submitFeedbackValidator.validate(ctx.request.body())
      const user = ctx.auth.getUserOrFail()
      return await submitFeedback(payload, user.id, user.fullName ?? '', ctx)
    } catch (error) {
      logger.error('feedback submit error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { session_id: sessionId } = await feedbackSessionIdParamsValidator.validate(ctx.params)
      return await getFeedbackVerdicts(sessionId)
    } catch (error) {
      logger.error('feedback get error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await feedbackVerdictIdValidator.validate(ctx.params)
      const user = ctx.auth.getUserOrFail()
      return await deleteFeedbackVerdict(id, user.id)
    } catch (error) {
      logger.error('feedback delete error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
