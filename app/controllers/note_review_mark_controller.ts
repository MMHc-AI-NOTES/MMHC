import type { HttpContext } from '@adonisjs/core/http'
import { markNoteReviewedValidator } from '#validators/note_review_mark_validator'
import { markNoteReviewed, getNoteReviewMark } from '#services/note_review_mark_service'
import ErrorService from '#services/error_service'
import vine from '@vinejs/vine'
import { getSmeReviewersNoteCounts } from '#services/note_review_mark_service'

const paramsValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    reviewer_id: vine.number().withoutDecimals(),
    note_version_id: vine.number().withoutDecimals(),
  })
)

export default class NoteReviewMarkController {
  public async update(ctx: HttpContext) {
    try {
      const payload = await markNoteReviewedValidator.validate(ctx.request.body())
      const currentUser = ctx.auth.getUserOrFail()
      const response = await markNoteReviewed(payload, currentUser.id, ctx)
      return response
    } catch (error) {
      console.log('Note review mark update error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const {
        note_id: noteId,
        reviewer_id: reviewerId,
        note_version_id: noteVersionId,
      } = await paramsValidator.validate(ctx.params)
      const response = await getNoteReviewMark(noteId, reviewerId, noteVersionId)
      return response
    } catch (error) {
      console.log('Note review mark get error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async smeReviewersNoteCounts(ctx: HttpContext) {
    try {
      const response = await getSmeReviewersNoteCounts()
      return response
    } catch (error) {
      console.log('Sme reviewers note counts error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
