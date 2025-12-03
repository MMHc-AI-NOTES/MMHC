import { createHumanReviewValidator } from '#validators/human_review_validator'
import { createHumanReview } from '#services/human_review_service'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'

export default class HumanReviewController {
  public async create(ctx: HttpContext) {
    try {
      const payload = await createHumanReviewValidator.validate(ctx.request.body())
      const humanReviewResponse = await createHumanReview(payload)
      return humanReviewResponse
    } catch (error) {
      console.log('Human review creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
