import { Worker, Job } from 'bullmq'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { redisConfig } from '#config/services'
import { NOTE_REVIEW_QUEUE_NAME } from '#jobs/queues/note_review_queue'
import { createMcpChat } from '#services/mcp_chat_service'

/**
 * How many notes one sweep will review. An MCP call takes roughly five to
 * fifteen seconds, so this bounds a run to well under the one minute interval
 * and keeps a backlog draining steadily rather than flooding the scorer.
 */
const NOTES_PER_SWEEP = 10

/** How many reviews run at once within a sweep. */
const CONCURRENCY = 3

/** User the created review records are attributed to (system admin). */
const SYSTEM_USER_ID = 1

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

  if (inProgressNoteIds.size > 0) {
    query.whereNotIn('session.note_id', Array.from(inProgressNoteIds))
  }

  return query.orderBy('id', 'asc').limit(limit).select('id', 'note_id')
}

const mapWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<void>
): Promise<void> => {
  let nextIndex = 0
  const worker = async () => {
    while (true) {
      const index = nextIndex++
      if (index >= items.length) return
      await mapper(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
}

export const runNoteReviewSweep = async (): Promise<{
  found: number
  reviewed: number
  failed: number
}> => {
  const notes = await findUnreviewedNotes(NOTES_PER_SWEEP)

  if (!notes.length) {
    return { found: 0, reviewed: 0, failed: 0 }
  }

  let reviewed = 0
  let failed = 0

  await mapWithConcurrency(notes, CONCURRENCY, async (note) => {
    inProgressNoteIds.add(note.note_id)
    try {
      await createMcpChat({ note_id: note.note_id }, SYSTEM_USER_ID)
      reviewed++
    } catch (error: any) {
      failed++
      logger.error('[NoteReview] Failed to review note', {
        noteId: note.note_id,
        error: error?.message ?? String(error),
      })
    } finally {
      inProgressNoteIds.delete(note.note_id)
    }
  })

  logger.info('[NoteReview] Sweep complete', { found: notes.length, reviewed, failed })
  return { found: notes.length, reviewed, failed }
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
      connection: redisConfig,
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
