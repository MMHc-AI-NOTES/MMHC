import {
  createHumanReviewValidator,
  updateHumanReviewValidator,
  humanReviewIdValidator,
} from '#validators/human_review_validator'
import {
  createHumanReview,
  listHumanReviews,
  getHumanReview,
  updateHumanReview,
  deleteHumanReview,
} from '#services/human_review_service'
import { paginationValidator } from '#validators/pagination_validator'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'

export default class HumanReviewController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const humanReviewResponse = await listHumanReviews(page, pageSize, filters, sorts)
      return sendSuccess('Human reviews listed successfully', humanReviewResponse)
    } catch (error) {
      console.log('Human review listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await humanReviewIdValidator.validate(ctx.params)
      const response = await getHumanReview(id)
      return response
    } catch (error) {
      console.log('Human review getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

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

  public async update(ctx: HttpContext) {
    try {
      const { id } = await humanReviewIdValidator.validate(ctx.params)
      const payload = await updateHumanReviewValidator.validate(ctx.request.body())
      const response = await updateHumanReview(id, payload)
      return response
    } catch (error) {
      console.log('Human review updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await humanReviewIdValidator.validate(ctx.params)
      const response = await deleteHumanReview(id)
      return response
    } catch (error) {
      console.log('Human review deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
