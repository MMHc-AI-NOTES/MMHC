import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import {
  noteListing,
  getNoteWithChats,
  getQueueStatistics,
  getWorkloadStatistics,
  getDashboardStatistics,
  updateNote,
  buildTestDataset,
} from '#services/note_service'
import { getNoteActivity } from '#services/note_activity_service'
import { paginationValidator } from '#validators/pagination_validator'
import { updateNoteValidator } from '#validators/note_validator'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

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
      const user = ctx.auth.getUserOrFail()
      const noteResponse = await noteListing(page, pageSize, filters, sorts, user)
      return sendSuccess('Notes listed successfully', noteResponse)
    } catch (error) {
      logger.error('Note listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async getWithChats(ctx: HttpContext) {
    try {
      const { noteId } = await noteIdValidator.validate(ctx.params)
      const user = ctx.auth.getUserOrFail()
      const noteResponse = await getNoteWithChats(noteId, user)
      return noteResponse
    } catch (error) {
      logger.error('Note with chats getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async activity(ctx: HttpContext) {
    try {
      const { noteId } = await noteIdValidator.validate(ctx.params)
      const activity = await getNoteActivity(noteId)
      return activity
    } catch (error) {
      logger.error('Note activity error', error)
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
      logger.error('Queue statistics error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async workloadStatistics(ctx: HttpContext) {
    try {
      const user = ctx.auth.getUserOrFail()
      const statistics = await getWorkloadStatistics(user.id)
      return sendSuccess('Workload statistics retrieved successfully', statistics)
    } catch (error) {
      logger.error('Workload statistics error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async testDataset(ctx: HttpContext) {
    try {
      const data = await buildTestDataset()
      return sendSuccess('Test dataset built successfully', data)
    } catch (error) {
      logger.error('Test dataset error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async dashboardStatistics(ctx: HttpContext) {
    try {
      const statistics = await getDashboardStatistics()
      return sendSuccess('Dashboard statistics retrieved successfully', statistics)
    } catch (error) {
      logger.error('Dashboard statistics error', error)
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
      logger.error('Note update error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
