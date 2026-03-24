import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class WebhookWorker extends BaseCommand {
  static commandName = 'webhook:worker'
  static description = 'Start or stop the webhook queue worker'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ alias: 's', description: 'Stop the worker' })
  declare stop: boolean

  async run() {
    const { startWebhookWorker, stopWebhookWorker } = await import('#jobs/workers/webhook_worker')
    if (this.stop) {
      this.logger.info('Stopping webhook worker...')
      await stopWebhookWorker()
      this.logger.success('Webhook worker stopped successfully')
    } else {
      this.logger.info('Starting webhook worker...')
      startWebhookWorker()
      this.logger.success('Webhook worker started successfully')
      this.logger.info('Press Ctrl+C to stop the worker')

      // Keep the process alive
      process.on('SIGINT', async () => {
        this.logger.info('\nStopping webhook worker...')
        await stopWebhookWorker()
        process.exit(0)
      })

      process.on('SIGTERM', async () => {
        this.logger.info('\nStopping webhook worker...')
        await stopWebhookWorker()
        process.exit(0)
      })

      // Keep process alive
      await new Promise(() => {})
    }
  }
}
