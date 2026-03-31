import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class DispatchEmailWorker extends BaseCommand {
  static commandName = 'dispatch_email_worker'
  static description = 'Start or stop the dispatch email queue worker'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ alias: 's', description: 'Stop the worker' })
  declare stop: boolean

  async run() {
    const { startDispatchEmailWorker, stopDispatchEmailWorker } = await import(
      '#jobs/workers/dispatch_email_worker'
    )
    if (this.stop) {
      this.logger.info('Stopping dispatch email worker...')
      await stopDispatchEmailWorker()
      this.logger.success('Dispatch email worker stopped successfully')
      return
    }

    this.logger.info('Starting dispatch email worker...')
    startDispatchEmailWorker()
    this.logger.success('Dispatch email worker started successfully')
    this.logger.info('Press Ctrl+C to stop the worker')

    process.on('SIGINT', async () => {
      this.logger.info('\nStopping dispatch email worker...')
      await stopDispatchEmailWorker()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      this.logger.info('\nStopping dispatch email worker...')
      await stopDispatchEmailWorker()
      process.exit(0)
    })

    await new Promise(() => {})
  }
}
