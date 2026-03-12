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
  deleteManagerReview,
  notifyPractitioner,
  bulkNotifyPractitioner,
} from '#services/manager_review_service'
import {
  notifyPractitionerValidator,
  bulkNotifyPractitionerValidator,
} from '#validators/manager_review_validator'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'

export default class ManagerReviewController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const managerReviewResponse = await listManagerReviews(page, pageSize, filters, sorts)
      return sendSuccess('Manager reviews listed successfully', managerReviewResponse)
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

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await managerReviewIdValidator.validate(ctx.params)
      const response = await deleteManagerReview(id)
      return response
    } catch (error) {
      console.log('Manager review deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async notifyPractitioner(ctx: HttpContext) {
    try {
      const payload = await notifyPractitionerValidator.validate(ctx.request.body())
      const response = await notifyPractitioner(payload)
      return response
    } catch (error) {
      console.log('Notify practitioner error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async bulkNotifyPractitioner(ctx: HttpContext) {
    try {
      const payload = await bulkNotifyPractitionerValidator.validate(ctx.request.body())
      const response = await bulkNotifyPractitioner(payload.manager_review_ids)
      return response
    } catch (error) {
      console.log('Bulk notify practitioner error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
