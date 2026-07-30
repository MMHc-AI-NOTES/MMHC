import { Worker, Job } from 'bullmq'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { bullConnection, bullPrefix } from '#jobs/bull_connection'
import { NOTE_REVIEW_QUEUE_NAME } from '#jobs/queues/note_review_queue'
import { createMcpChat } from '#services/mcp_chat_service'
import { syncUnprocessedMorfNotes } from '#services/morf_sync_service'
import {
  clearReviewFailure,
  getSkippableNoteIds,
  recordReviewFailure,
} from '#services/note_review_failure_service'
import {
  CONCURRENCY,
  NOTES_PER_SWEEP,
  SYSTEM_USER_ID,
  mapWithConcurrency,
} from '#services/note_review_sweep_policy'
import {
  clearStaleClaims,
  getClaimedNoteIds,
  isNoteReviewInProgressError,
} from '#services/note_review_claim_service'

let noteReviewWorker: Worker | null = null
let redisFailureHandled = false
const inProgressNoteIds = new Set<string>()

/** Notes that have no AI review yet, oldest first so the backlog drains in order. */
const findUnreviewedNotes = async (limit: number): Promise<{ id: number; note_id: string }[]> => {
  const query = db
    .from('session')
    .whereNull('deleted_at')
    .whereNotExists((subQuery) => {
      subQuery.from('chats').whereRaw('chats.note_id = session.note_id')
    })

  // Three sets are excluded:
  //  - notes this process is already reviewing
  //  - notes any process holds a claim on, including the API process serving
  //    the Re-run Audit button, which an in memory set cannot see
  //  - notes that are quarantined or still inside their retry backoff, so a
  //    note the scorer can never process does not sit at the head of every
  //    batch and block the backlog behind it
  const [claimed, skippable] = await Promise.all([getClaimedNoteIds(), getSkippableNoteIds()])
  const skip = new Set([...inProgressNoteIds, ...claimed, ...skippable])

  if (skip.size > 0) {
    query.whereNotIn('session.note_id', Array.from(skip))
  }

  return query.orderBy('id', 'asc').limit(limit).select('id', 'note_id')
}

export const runNoteReviewSweep = async (): Promise<{
  found: number
  reviewed: number
  failed: number
  contended: number
}> => {
  // Sync any unprocessed MORF payloads into session records first
  try {
    await syncUnprocessedMorfNotes()
  } catch (morfErr: any) {
    logger.error('[NoteReview] Error during pre-sweep MORF sync', { error: morfErr?.message })
  }

  // Free claims abandoned by a process that died mid review, otherwise those
  // notes would be skipped until something else cleaned them up.
  try {
    const cleared = await clearStaleClaims()
    if (cleared > 0) logger.warn('[NoteReview] Cleared stale review claims', { cleared })
  } catch (claimErr: any) {
    logger.error('[NoteReview] Could not clear stale claims', { error: claimErr?.message })
  }

  const notes = await findUnreviewedNotes(NOTES_PER_SWEEP)

  if (!notes.length) {
    return { found: 0, reviewed: 0, failed: 0, contended: 0 }
  }

  let reviewed = 0
  let failed = 0
  let contended = 0

  await mapWithConcurrency(notes, CONCURRENCY, async (note) => {
    inProgressNoteIds.add(note.note_id)
    try {
      await createMcpChat({ note_id: note.note_id }, SYSTEM_USER_ID)
      reviewed++
      await clearReviewFailure(note.note_id)
    } catch (error: any) {
      // Another process claimed the note between the query and the call. That
      // is the guard working, not a review failure, so it must not count
      // toward quarantine.
      if (isNoteReviewInProgressError(error)) {
        contended++
        logger.info('[NoteReview] Note already being reviewed elsewhere', {
          noteId: note.note_id,
        })
        return
      }

      failed++
      const message = error?.message ?? String(error)
      logger.error('[NoteReview] Failed to review note', { noteId: note.note_id, error: message })
      await recordReviewFailure(note.note_id, error).catch((trackingError: any) => {
        logger.error('[NoteReview] Could not record failure', {
          noteId: note.note_id,
          error: trackingError?.message,
        })
      })
    } finally {
      inProgressNoteIds.delete(note.note_id)
    }
  })

  logger.info('[NoteReview] Sweep complete', {
    found: notes.length,
    reviewed,
    failed,
    contended,
  })
  return { found: notes.length, reviewed, failed, contended }
}

export const startNoteReviewWorker = () => {
  if (noteReviewWorker) {
    logger.info('Note review worker already running')
    return noteReviewWorker
  }

  noteReviewWorker = new Worker(
    NOTE_REVIEW_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`[NoteReview] Sweep started (job ${job.id})`)
      return runNoteReviewSweep()
    },
    {
      connection: bullConnection,
      // Must match the queue's prefix or the worker watches the wrong keys.
      prefix: bullPrefix,
      // One sweep at a time. Without this an overrunning sweep could overlap
      // the next and review the same note twice.
      concurrency: 1,
      lockDuration: 300000,
    }
  )

  noteReviewWorker.on('failed', (job, err) => {
    logger.error(`[NoteReview] Sweep ${job?.id} failed: ${err.message}`)
  })

  noteReviewWorker.on('error', (err: any) => {
    if (err?.message?.includes?.('Missing key for job')) return
    logger.error('[NoteReview] Worker error:', err)

    // Let ECS restart the task when Redis is unavailable, matching the other
    // workers. Staying alive here would leave reviews silently stopped.
    if (!redisFailureHandled) {
      redisFailureHandled = true
      void stopNoteReviewWorker().finally(() => process.exit(1))
    }
  })

  logger.info('Note review worker started')
  return noteReviewWorker
}

export const stopNoteReviewWorker = async () => {
  if (noteReviewWorker) {
    await noteReviewWorker.close()
    noteReviewWorker = null
    redisFailureHandled = false
    logger.info('Note review worker stopped')
  }
}
