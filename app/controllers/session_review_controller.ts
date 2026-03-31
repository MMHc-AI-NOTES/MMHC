import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import { invokeSessionReview } from '#services/session_review_service'
import { invokeSessionReviewValidator } from '#validators/session_review_validator'

export default class SessionReviewController {
  public async invoke(ctx: HttpContext) {
    try {
      const payload = await invokeSessionReviewValidator.validate(ctx.request.body())
      const response = await invokeSessionReview(payload)
      return response
    } catch (error) {
      console.log('session review invoke error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
