import type { ApplicationService } from '@adonisjs/core/types'

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    // Worker will be started in ready hook
  }

  async ready() {
    // Worker is now started manually via command: node ace webhook:worker
    // Auto-start removed to allow manual control
  }

  async shutdown() {
    const { stopWebhookWorker } = await import('#jobs/workers/webhook_worker')
    await stopWebhookWorker()
    console.log('Queue workers stopped')
  }
}
