import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import {
  submitFeedback,
  getFeedbackVerdicts,
  deleteFeedbackVerdict,
} from '#services/feedback_service'
import { submitFeedbackValidator, feedbackVerdictIdValidator } from '#validators/feedback_validator'
import vine from '@vinejs/vine'

const noteIdParamsValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
  })
)

export default class FeedbackController {
  public async submit(ctx: HttpContext) {
    try {
      console.log('[Feedback] Incoming request body:', ctx.request.body())
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
      const { note_id: noteId } = await noteIdParamsValidator.validate(ctx.params)
      const reviewerIdParam = ctx.request.input('reviewer_id')
      const reviewerId =
        reviewerIdParam !== undefined && reviewerIdParam !== null && reviewerIdParam !== ''
          ? Number(reviewerIdParam)
          : undefined

      return await getFeedbackVerdicts(noteId, reviewerId)
    } catch (error) {
      console.log('feedback get error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await feedbackVerdictIdValidator.validate(ctx.params)
      return await deleteFeedbackVerdict(id)
    } catch (error) {
      console.log('feedback delete error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
