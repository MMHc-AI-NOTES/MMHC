import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { noteListing } from '#services/note_service'
import { paginationValidator } from '#validators/pagination_validator'
import type { HttpContext } from '@adonisjs/core/http'

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
}
