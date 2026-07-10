import type { HttpContext } from '@adonisjs/core/http'
import { webhookSessionValidator } from '#validators/webhook_validator'
import ErrorService from '#services/error_service'
import { createSessionFromWebhook } from '#services/webhook_service'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import { addWebhookJob } from '#jobs/queues/webhook_queue'

export default class WebhookController {
  /**
   * Main webhook: process synchronously (no BullMQ) to avoid "Missing key for job" errors.
   * Session is created/updated in the same request and response is returned.
   */
  public async session(ctx: HttpContext) {
    try {
      const payload = await webhookSessionValidator.validate(ctx.request.body())
      const result = await createSessionFromWebhook(payload)
      const sessionFromResult = (result as any)?.data?.session

      await createAuditLog({
        ctx,
        description: `Webhook received for note ${payload.NoteId}`,
        action: AuditActionEnum.webhookSessionReceived,
        status: true,
        modelType: sessionFromResult ? 'Session' : null,
        modelId: sessionFromResult?.id ?? null,
        noteId: sessionFromResult?.noteId ?? payload.NoteId,
        metadata: {
          note_id: sessionFromResult?.noteId ?? payload.NoteId,
          session_id: sessionFromResult?.id ?? null,
          raw_payload: payload,
        },
      })
      return ctx.response.send(result)
    } catch (error: any) {
      ctx.logger.error('Webhook error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  /** Handle webhook request by adding it to BullMQ queue for async processing */
  public async handle(ctx: HttpContext) {
    try {
      const payload = await webhookSessionValidator.validate(ctx.request.body())
      const job = await addWebhookJob({
        payload,
        receivedAt: new Date().toISOString(),
      })

      await createAuditLog({
        ctx,
        description: `Webhook received and queued for note ${payload.NoteId} (Job: ${job.id})`,
        action: AuditActionEnum.webhookSessionReceived,
        status: true,
        noteId: payload.NoteId,
        metadata: {
          note_id: payload.NoteId,
          job_id: job.id,
          raw_payload: payload,
        },
      })

      return ctx.response.send({
        status: 'success',
        message: 'Webhook received and queued for processing',
        jobId: job.id,
      })
    } catch (error: any) {
      ctx.logger.error('Webhook queuing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
