import type { HttpContext } from '@adonisjs/core/http'
import { createSessionFromWebhook } from '#services/webhook_service'
import { webhookSessionValidator } from '#validators/webhook_validator'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'
import { addWebhookJob } from '#jobs/queues/webhook_queue'

export default class WebhookController {
  // Legacy synchronous endpoint (main-branch behaviour)
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

  // Queue-based endpoint: same payload as main, processed asynchronously via BullMQ
  public async handle(ctx: HttpContext) {
    try {
      const payload = await webhookSessionValidator.validate(ctx.request.body())

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
      return ctx.response.status(400).send({
        status: false,
        message: error?.message || 'Webhook processing failed',
      })
    }
  }
}
