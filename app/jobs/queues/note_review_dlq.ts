import { Queue } from 'bullmq'
import { bullConnection, bullPrefix } from '#jobs/bull_connection'
import logger from '@adonisjs/core/services/logger'

export const NOTE_REVIEW_DLQ_NAME = 'note-review-dlq'

export interface NoteReviewDlqPayload {
  noteId: string
  attempts: number
  lastError: string
  failedAt: string
}

/**
 * Where a note lands once the automatic review has given up on it. The sweep
 * finds its work by querying the database, so a failed note is never lost, but
 * a note that can never be scored still needs somewhere visible to stop.
 */
export const noteReviewDlq = new Queue<NoteReviewDlqPayload>(NOTE_REVIEW_DLQ_NAME, {
  connection: bullConnection,
  // Matched to the queue it partners, so both live in one Redis namespace.
  prefix: bullPrefix,
  defaultJobOptions: {
    // Nothing consumes these to completion, so they are kept rather than
    // trimmed aggressively: the queue is the record of what needs looking at.
    removeOnComplete: 500,
    removeOnFail: 500,
  },
})

export const buildDlqJobName = (noteId: string): string => `dlq-note-${noteId}`

/** Unique per failure, so a note failing twice does not overwrite its history. */
export const buildDlqJobId = (noteId: string, at: number = Date.now()): string =>
  `dlq-${noteId}-${at}`

/** Identifiers and timings only. No patient content goes into Redis. */
export const buildDlqPayload = (payload: NoteReviewDlqPayload): NoteReviewDlqPayload => ({
  noteId: payload.noteId,
  attempts: payload.attempts,
  lastError: payload.lastError ?? '',
  failedAt: payload.failedAt,
})

/**
 * Moves a permanently failed note to the dead letter queue. Never throws: a
 * Redis problem here must not mask the review failure that caused it.
 */
export const pushToNoteReviewDlq = async (payload: NoteReviewDlqPayload) => {
  try {
    const job = await noteReviewDlq.add(buildDlqJobName(payload.noteId), buildDlqPayload(payload), {
      jobId: buildDlqJobId(payload.noteId),
    })

    logger.warn('[NoteReview DLQ] Moved note to dead letter queue', {
      noteId: payload.noteId,
      attempts: payload.attempts,
      dlqJobId: job.id,
      error: payload.lastError,
    })

    return job
  } catch (error: any) {
    logger.error('[NoteReview DLQ] Failed to push to dead letter queue', {
      noteId: payload.noteId,
      error: error?.message ?? String(error),
    })
    return undefined
  }
}
