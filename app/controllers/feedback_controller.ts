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

export default class FeedbackController {
  public async submit(ctx: HttpContext) {
    try {
      const payload = await submitFeedbackValidator.validate(ctx.request.body())
      console.log('[Feedback] Validated payload:', payload)
      const user = ctx.auth.getUserOrFail()
      return await submitFeedback(payload, user.id, ctx)
    } catch (error) {
      console.log('feedback submit error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { session_id: sessionId } = await feedbackSessionIdParamsValidator.validate(ctx.params)
      return await getFeedbackVerdicts(sessionId)
    } catch (error) {
      console.log('feedback get error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await feedbackVerdictIdValidator.validate(ctx.params)
      const user = ctx.auth.getUserOrFail()
      return await deleteFeedbackVerdict(id, user.id)
    } catch (error) {
      console.log('feedback delete error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
