import type { HttpContext } from '@adonisjs/core/http'
import { createSessionFromWebhook } from '#services/webhook_service'
import { webhookSessionValidator } from '#validators/webhook_validator'
import ErrorService from '#services/error_service'

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
}
