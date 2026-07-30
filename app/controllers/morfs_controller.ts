import logger from '@adonisjs/core/services/logger'
import Morf from '#models/morf'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { syncUnprocessedMorfNotes } from '#services/morf_sync_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class MorfsController {
  public async create(ctx: HttpContext) {
    try {
      const body = ctx.request.body()

      await Morf.create({
        noteId: body.NoteId,
        data: body,
      })

      // Asynchronously trigger MORF note sync & session creation
      void syncUnprocessedMorfNotes().catch((error) => {
        logger.error('Background MORF sync error', error)
      })

      return sendSuccess('Morf created successfully', body)
    } catch (error) {
      logger.error('Morf creation error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
