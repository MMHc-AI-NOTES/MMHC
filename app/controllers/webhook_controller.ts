import { webhookValidator } from '#validators/webhook_validator'
import type { HttpContext } from '@adonisjs/core/http'
import { sendSuccess } from '#services/custom_response_service'
import { addWebhookJob } from '#jobs/queues/webhook_queue'

export default class WebhookController {
  public async handle(ctx: HttpContext) {
    try {
      const payload = await webhookValidator.validate(ctx.request.body())

      await addWebhookJob({
        NoteId: payload.NoteId,
        Type: payload.Type || 'Unknown',
        ClientId: payload.ClientId ?? null,
        receivedAt: new Date().toISOString(),
      })

      return sendSuccess('Webhook received and queued for processing', {
        received: true,
        queued: true,
        noteId: payload.NoteId,
      })
    } catch (error: any) {
      ctx.logger.error('Webhook error', error)
      return ctx.response.status(400).send({
        status: false,
        message: error?.message || 'Webhook processing failed',
      })
    }
  }
}
