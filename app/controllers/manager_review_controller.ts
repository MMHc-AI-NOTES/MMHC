import type { HttpContext } from '@adonisjs/core/http'
import { paginationValidator } from '#validators/pagination_validator'
import {
  managerReviewIdValidator,
  updateManagerReviewValidator,
} from '#validators/manager_review_validator'
import {
  listManagerReviews,
  getManagerReview,
  updateManagerReview,
} from '#services/manager_review_service'
import ErrorService from '#services/error_service'

export default class ManagerReviewController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const managerReviewResponse = await listManagerReviews(page, pageSize, filters, sorts)
      return managerReviewResponse
    } catch (error) {
      console.log('Manager review listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await managerReviewIdValidator.validate(ctx.params)
      const managerReviewResponse = await getManagerReview(id)
      return managerReviewResponse
    } catch (error) {
      console.log('Manager review getting by id error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { id } = await managerReviewIdValidator.validate(ctx.params)
      const payload = await updateManagerReviewValidator.validate(ctx.request.body())
      const response = await updateManagerReview(id, payload)
      return response
    } catch (error) {
      console.log('Manager review updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
