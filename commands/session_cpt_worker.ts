import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SessionCptWorker extends BaseCommand {
  static commandName = 'session:cpt-worker'
  static description = 'Start or stop the session CPT code queue worker'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ alias: 's', description: 'Stop the worker' })
  declare stop: boolean

  async run() {
    const { startSessionCptWorker, stopSessionCptWorker } = await import(
      '#jobs/workers/session_cpt_worker'
    )
    if (this.stop) {
      this.logger.info('Stopping session CPT worker...')
      await stopSessionCptWorker()
      this.logger.success('Session CPT worker stopped successfully')
      return
    }

    this.logger.info('Starting session CPT worker...')
    startSessionCptWorker()
    this.logger.success('Session CPT worker started successfully')
    this.logger.info('Press Ctrl+C to stop the worker')

    process.on('SIGINT', async () => {
      this.logger.info('\nStopping session CPT worker...')
      await stopSessionCptWorker()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      this.logger.info('\nStopping session CPT worker...')
      await stopSessionCptWorker()
      process.exit(0)
    })

    await new Promise(() => {})
  }
}
