import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class WebhookDrain extends BaseCommand {
  static commandName = 'webhook:drain'

  static description =
    'Clear all jobs from the webhook queue (stops "Missing key" errors from stale jobs)'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({
    description: 'Fully obliterate queue (all keys). Use if drain is not enough.',
  })
  declare obliterate: boolean

  async run() {
    const { webhookQueue } = await import('#jobs/queues/webhook_queue')

    if (this.obliterate) {
      this.logger.info('Obliterating webhook queue...')
      await webhookQueue.obliterate({ force: true })
      this.logger.success('Webhook queue obliterated.')
    } else {
      this.logger.info('Draining webhook queue...')
      await webhookQueue.drain(true)
      this.logger.success('Webhook queue drained (waiting + delayed jobs removed).')
    }
    this.logger.info('Stop the worker (Ctrl+C) if it is running; webhooks now run synchronously.')
  }
}
