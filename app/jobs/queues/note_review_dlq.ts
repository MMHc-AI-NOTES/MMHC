import { Queue } from 'bullmq'
import { redisConfig } from '#config/services'
import logger from '@adonisjs/core/services/logger'

export const NOTE_REVIEW_DLQ_NAME = 'note-review-dlq'

export interface NoteReviewDlqPayload {
  noteId: string
  attempts: number
  lastError: string
  failedAt: string
  metadata?: Record<string, any>
}

export const noteReviewDlq = new Queue(NOTE_REVIEW_DLQ_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 500,
  },
})

/**
 * Push a permanently failed or max-retried note to the BullMQ Dead Letter Queue.
 */
export const pushToNoteReviewDlq = async (payload: NoteReviewDlqPayload) => {
  try {
    const job = await noteReviewDlq.add(`dlq-note-${payload.noteId}`, payload, {
      jobId: `dlq-${payload.noteId}-${Date.now()}`,
    })
    logger.warn('[NoteReview DLQ] Moved note to Dead Letter Queue', {
      noteId: payload.noteId,
      attempts: payload.attempts,
      dlqJobId: job.id,
      error: payload.lastError,
    })
    return job
  } catch (error: any) {
    logger.error('[NoteReview DLQ] Failed to push to Dead Letter Queue', {
      noteId: payload.noteId,
      error: error?.message ?? String(error),
    })
  }
}
