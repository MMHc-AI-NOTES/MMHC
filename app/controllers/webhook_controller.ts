import type { HttpContext } from '@adonisjs/core/http'
import { webhookSessionValidator } from '#validators/webhook_validator'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'
import { addWebhookJob } from '#jobs/queues/webhook_queue'

export default class WebhookController {
  public async session(ctx: HttpContext) {
    try {
      const payload = await webhookSessionValidator.validate(ctx.request.body())

      // Enqueue job for asynchronous processing
      await addWebhookJob({
        payload,
        receivedAt: new Date().toISOString(),
      })

      return sendSuccess('Webhook received and queued for processing', {
        received: true,
        queued: true,
        noteId: payload.NoteId,
      })
    } catch (error: any) {
      ctx.logger.error('Webhook error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
