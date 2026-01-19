import type { HttpContext } from '@adonisjs/core/http'
import { createSessionFromWebhook } from '#services/webhook_service'
import { webhookSessionValidator, webhookValidator } from '#validators/webhook_validator'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'
import { addWebhookJob } from '#jobs/queues/webhook_queue'

export default class WebhookController {
  public async session(ctx: HttpContext) {
    try {
      const payload = await webhookSessionValidator.validate(ctx.request.body())
      const response = await createSessionFromWebhook(payload)
      return response
    } catch (error) {
      console.log('Webhook session creation error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

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
