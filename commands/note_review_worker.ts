import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class NoteReviewWorker extends BaseCommand {
  static commandName = 'note:review-worker'
  static description = 'Start or stop the automatic note review worker'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ alias: 's', description: 'Stop the worker' })
  declare stop: boolean

  async run() {
    const { startNoteReviewWorker, stopNoteReviewWorker } = await import(
      '#jobs/workers/note_review_worker'
    )
    const { scheduleNoteReviewSweep } = await import('#jobs/queues/note_review_queue')

    if (this.stop) {
      this.logger.info('Stopping note review worker...')
      await stopNoteReviewWorker()
      this.logger.success('Note review worker stopped successfully')
      return
    }

    // Register the repeating sweep, then start consuming it. Registering here
    // means the schedule exists wherever the worker runs, with nothing to set
    // up by hand after a deploy.
    await scheduleNoteReviewSweep()
    this.logger.info('Note review sweep scheduled to run every minute')

    startNoteReviewWorker()
    this.logger.success('Note review worker started successfully')
    this.logger.info('Press Ctrl+C to stop the worker')

    process.on('SIGINT', async () => {
      this.logger.info('\nStopping note review worker...')
      await stopNoteReviewWorker()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      this.logger.info('\nStopping note review worker...')
      await stopNoteReviewWorker()
      process.exit(0)
    })

    await new Promise(() => {})
  }
}
