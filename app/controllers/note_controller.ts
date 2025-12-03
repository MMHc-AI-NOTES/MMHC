import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import {
  noteListing,
  getNoteWithChats,
  getQueueStatistics,
  getWorkloadStatistics,
  updateNote,
} from '#services/note_service'
import { paginationValidator } from '#validators/pagination_validator'
import { updateNoteValidator } from '#validators/note_validator'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'

const noteIdValidator = vine.compile(
  vine.object({
    noteId: vine.string().trim().minLength(1),
  })
)

export default class NotesController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const noteResponse = await noteListing(page, pageSize, filters, sorts)
      return sendSuccess('Notes listed successfully', noteResponse)
    } catch (error) {
      console.log('Note listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async getWithChats(ctx: HttpContext) {
    try {
      const { noteId } = await noteIdValidator.validate(ctx.params)
      const noteResponse = await getNoteWithChats(noteId)
      return noteResponse
    } catch (error) {
      console.log('Note with chats getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async queueStatistics(ctx: HttpContext) {
    try {
      const startDate = ctx.request.qs().start_date
      const endDate = ctx.request.qs().end_date
      const statistics = await getQueueStatistics(startDate, endDate)
      return sendSuccess('Queue statistics retrieved successfully', statistics)
    } catch (error) {
      console.log('Queue statistics error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async workloadStatistics(ctx: HttpContext) {
    try {
      const user = ctx.auth.getUserOrFail()
      const statistics = await getWorkloadStatistics(user.id)
      return sendSuccess('Workload statistics retrieved successfully', statistics)
    } catch (error) {
      console.log('Workload statistics error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { noteId } = await noteIdValidator.validate(ctx.params)
      const payload = await updateNoteValidator.validate(ctx.request.body())
      const noteResponse = await updateNote(noteId, payload)
      return noteResponse
    } catch (error) {
      console.log('Note update error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
