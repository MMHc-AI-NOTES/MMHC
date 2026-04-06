import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import { invokeSessionReview } from '#services/session_review_service'
import { invokeSessionReviewValidator } from '#validators/session_review_validator'

/**
 * Playground: same evaluation path as chat create (session + agent + previous note chain),
 * but no Chat row and no session workflow updates. Body matches create chat + optional overrides.
 */
export default class TestChatController {
  public async chat(ctx: HttpContext) {
    try {
      const payload = await invokeSessionReviewValidator.validate(ctx.request.body())
      return await invokeSessionReview(payload)
    } catch (error) {
      console.log('test chat error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
