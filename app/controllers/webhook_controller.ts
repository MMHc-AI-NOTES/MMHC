import type { HttpContext } from '@adonisjs/core/http'
import { webhookSessionValidator } from '#validators/webhook_validator'
import ErrorService from '#services/error_service'
import { createSessionFromWebhook } from '#services/webhook_service'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'

export default class WebhookController {
  /**
   * Main webhook: process synchronously (no BullMQ) to avoid "Missing key for job" errors.
   * Session is created/updated in the same request and response is returned.
   */
  public async session(ctx: HttpContext) {
    try {
      const payload = await webhookSessionValidator.validate(ctx.request.body())
      await createAuditLog({
        ctx,
        description: `Webhook received for note ${payload.NoteId}`,
        action: AuditActionEnum.webhookSessionReceived,
        status: true,
        metadata: {
          note_id: payload.NoteId,
          raw_payload: payload,
        },
      })
      const result = await createSessionFromWebhook(payload)
      return ctx.response.send(result)
    } catch (error: any) {
      ctx.logger.error('Webhook error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  /** Alias: same as session (sync processing). */
  public async handle(ctx: HttpContext) {
    return this.session(ctx)
  }
}
