import logger from '@adonisjs/core/services/logger'
import Morf from '#models/morf'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { createSessionFromWebhook } from '#services/webhook_service'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import type { HttpContext } from '@adonisjs/core/http'

export default class MorfsController {
  public async create(ctx: HttpContext) {
    try {
      const body = ctx.request.body()
      const noteId = body.NoteId ?? body.note_id ?? body.noteId

      const morf = await Morf.create({
        noteId: noteId ?? '',
        data: body,
        isProcessed: false,
      })

      // Directly process MORF payload into session record (same pipeline as PracticeQ)
      const result = await createSessionFromWebhook(body)
      const sessionFromResult = (result as any)?.data?.session

      morf.isProcessed = true
      await morf.save()

      await createAuditLog({
        ctx,
        description: `MORF Webhook received for note ${noteId}`,
        action: AuditActionEnum.webhookSessionReceived,
        status: true,
        modelType: sessionFromResult ? 'Session' : null,
        modelId: sessionFromResult?.id ?? null,
        noteId: sessionFromResult?.noteId ?? noteId,
        metadata: {
          note_id: sessionFromResult?.noteId ?? noteId,
          session_id: sessionFromResult?.id ?? null,
          raw_payload: body,
          morf_id: morf.id,
        },
      })

      return sendSuccess('Morf created and processed successfully', (result as any)?.data ?? body)
    } catch (error) {
      logger.error('Morf creation error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}

