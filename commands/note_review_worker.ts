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

  @flags.boolean({
    description: 'Clear quarantined notes so they are retried, then exit',
  })
  declare release: boolean

  @flags.string({ description: 'Limit --release to a single note id' })
  declare noteId?: string

  async run() {
    const { startNoteReviewWorker, stopNoteReviewWorker } = await import(
      '#jobs/workers/note_review_worker'
    )
    const { scheduleNoteReviewSweep } = await import('#jobs/queues/note_review_queue')

    if (this.release) {
      const { releaseQuarantine } = await import('#services/note_review_failure_service')
      const cleared = await releaseQuarantine(this.noteId)
      this.logger.success(`Released ${cleared} quarantined note${cleared === 1 ? '' : 's'}`)
      return
    }

    const { startNoteReviewDlqWorker, stopNoteReviewDlqWorker } = await import(
      '#jobs/workers/note_review_dlq_worker'
    )

    if (this.stop) {
      this.logger.info('Stopping note review worker and DLQ handler...')
      await stopNoteReviewWorker()
      await stopNoteReviewDlqWorker()
      this.logger.success('Note review worker stopped successfully')
      return
    }

    // Register the repeating sweep, then start consuming it. Registering here
    // means the schedule exists wherever the worker runs, with nothing to set
    // up by hand after a deploy.
    await scheduleNoteReviewSweep()
    this.logger.info('Note review sweep scheduled to run every minute')

    startNoteReviewWorker()
    startNoteReviewDlqWorker()
    this.logger.success('Note review worker and DLQ handler started successfully')
    this.logger.info('Press Ctrl+C to stop the worker')

    process.on('SIGINT', async () => {
      this.logger.info('\nStopping note review worker...')
      await stopNoteReviewWorker()
      await stopNoteReviewDlqWorker()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      this.logger.info('\nStopping note review worker...')
      await stopNoteReviewWorker()
      await stopNoteReviewDlqWorker()
      process.exit(0)
    })

    await new Promise(() => {})
  }
}
