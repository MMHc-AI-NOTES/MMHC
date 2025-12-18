import type { ApplicationService } from '@adonisjs/core/types'

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    // Worker will be started in ready hook
  }

  async ready() {
    // Only start worker in web environment (not during migrations, etc.)
    if (this.app.getEnvironment() === 'web') {
      const { startWebhookWorker } = await import('#jobs/workers/webhook_worker')
      startWebhookWorker()
      console.log('Queue workers initialized')
    }
  }

  async shutdown() {
    const { stopWebhookWorker } = await import('#jobs/workers/webhook_worker')
    await stopWebhookWorker()
    console.log('Queue workers stopped')
  }
}
