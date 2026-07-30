import { Worker, Job } from 'bullmq'
import logger from '@adonisjs/core/services/logger'
import { redisConfig } from '#config/services'
import { NOTE_REVIEW_DLQ_NAME, type NoteReviewDlqPayload } from '#jobs/queues/note_review_dlq'
import Session from '#models/session'
import { AiStatusEnum } from '#enums/session_enum'

let noteReviewDlqWorker: Worker | null = null

/**
 * Dead Letter Queue Worker: Consumes failed note review jobs from BullMQ DLQ,
 * logs detailed diagnostics, and updates database session records.
 */
export const startNoteReviewDlqWorker = () => {
  if (noteReviewDlqWorker) {
    logger.info('Note review DLQ worker already running')
    return noteReviewDlqWorker
  }

  noteReviewDlqWorker = new Worker(
    NOTE_REVIEW_DLQ_NAME,
    async (job: Job<NoteReviewDlqPayload>) => {
      const { noteId, attempts, lastError, failedAt } = job.data
      logger.error(`[DLQ Handler] Processing dead letter job for note ${noteId}`, {
        dlqJobId: job.id,
        noteId,
        attempts,
        lastError,
        failedAt,
      })

      // Update session aiStatus to failed so administrative dashboard flags it
      const session = await Session.findBy('note_id', noteId)
      if (session) {
        session.aiStatus = AiStatusEnum.failed
        await session.save()
        logger.info(`[DLQ Handler] Marked session ai_status = failed for note ${noteId}`)
      }
    },
    {
      connection: redisConfig,
      concurrency: 2,
    }
  )

  noteReviewDlqWorker.on('failed', (job, err) => {
    logger.error(`[DLQ Handler] DLQ Job ${job?.id} failed: ${err.message}`)
  })

  logger.info('Note review DLQ worker started')
  return noteReviewDlqWorker
}

export const stopNoteReviewDlqWorker = async () => {
  if (noteReviewDlqWorker) {
    await noteReviewDlqWorker.close()
    noteReviewDlqWorker = null
    logger.info('Note review DLQ worker stopped')
  }
}
