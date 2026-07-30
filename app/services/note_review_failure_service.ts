import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export const NOTE_REVIEW_FAILURES_TABLE = 'note_review_failures'

/** Attempts before a note is quarantined and stops being retried. */
export const MAX_REVIEW_ATTEMPTS = 5

/** Longest error text kept, so one huge stack trace cannot bloat the row. */
export const MAX_ERROR_LENGTH = 2000

export interface NoteReviewFailureRow {
  note_id: string
  attempts: number
  last_error: string | null
  last_attempt_at: Date | string | null
  quarantined_at: Date | string | null
}

/**
 * Minutes to wait before retrying a note that has already failed. Grows with
 * the attempt count so a note failing during a transient scorer outage backs
 * off instead of consuming a slot in every single sweep.
 */
export const backoffMinutesFor = (attempts: number): number => {
  const schedule = [1, 5, 15, 60]
  if (!Number.isFinite(attempts) || attempts < 1) return schedule[0]
  return schedule[Math.min(Math.floor(attempts), schedule.length) - 1]
}

/** Trims and bounds an error message before it is stored. */
export const normaliseErrorMessage = (error: unknown): string => {
  const raw =
    error instanceof Error
      ? (error.message ?? '')
      : typeof error === 'string'
        ? error
        : error === null || error === undefined
          ? ''
          : String(error)

  return raw.trim().slice(0, MAX_ERROR_LENGTH)
}

/**
 * Whether a note with an existing failure record should be skipped by the next
 * sweep. Quarantined notes are always skipped; the rest are skipped until their
 * backoff has elapsed.
 */
export const shouldSkipNote = (row: NoteReviewFailureRow, now: DateTime): boolean => {
  if (row.quarantined_at) return true
  if (!row.last_attempt_at) return false

  const lastAttempt = DateTime.fromJSDate(new Date(row.last_attempt_at))
  if (!lastAttempt.isValid) return false

  return lastAttempt.plus({ minutes: backoffMinutesFor(row.attempts) }) > now
}

/** The row values to write after a failed attempt. */
export const nextFailureState = (
  existing: { attempts: number } | null,
  error: unknown,
  now: DateTime
): {
  attempts: number
  last_error: string
  last_attempt_at: string
  quarantined_at: string | null
} => {
  const previousAttempts = existing && Number.isFinite(existing.attempts) ? existing.attempts : 0
  const attempts = Math.max(0, previousAttempts) + 1
  const timestamp = now.toSQL({ includeOffset: false }) as string

  return {
    attempts,
    last_error: normaliseErrorMessage(error),
    last_attempt_at: timestamp,
    quarantined_at: attempts >= MAX_REVIEW_ATTEMPTS ? timestamp : null,
  }
}

/** Note ids the sweep must skip: quarantined, or still inside their backoff. */
export const getSkippableNoteIds = async (now: DateTime = DateTime.now()): Promise<string[]> => {
  const rows: NoteReviewFailureRow[] = await db
    .from(NOTE_REVIEW_FAILURES_TABLE)
    .select('note_id', 'attempts', 'last_error', 'last_attempt_at', 'quarantined_at')

  return rows.filter((row) => shouldSkipNote(row, now)).map((row) => row.note_id)
}

export const recordReviewFailure = async (
  noteId: string,
  error: unknown,
  now: DateTime = DateTime.now()
): Promise<void> => {
  const existing = await db
    .from(NOTE_REVIEW_FAILURES_TABLE)
    .where('note_id', noteId)
    .select('id', 'attempts')
    .first()

  const state = nextFailureState(existing ?? null, error, now)
  const timestamp = now.toSQL({ includeOffset: false })

  if (!existing) {
    await db
      .table(NOTE_REVIEW_FAILURES_TABLE)
      .insert({ note_id: noteId, ...state, created_at: timestamp, updated_at: timestamp })
  } else {
    await db
      .from(NOTE_REVIEW_FAILURES_TABLE)
      .where('id', existing.id)
      .update({ ...state, updated_at: timestamp })
  }

  // Push to the BullMQ dead letter queue once the note reaches max retries.
  // Imported lazily so the pure helpers above stay importable without opening a
  // Redis connection at module load.
  if (state.quarantined_at) {
    const { pushToNoteReviewDlq } = await import('#jobs/queues/note_review_dlq')
    void pushToNoteReviewDlq({
      noteId,
      attempts: state.attempts,
      lastError: state.last_error,
      failedAt: state.quarantined_at,
    })
  }
}

/** Clears the failure record once a note reviews successfully. */
export const clearReviewFailure = async (noteId: string): Promise<void> => {
  await db.from(NOTE_REVIEW_FAILURES_TABLE).where('note_id', noteId).delete()
}

export const getQuarantinedNotes = async (limit = 50): Promise<NoteReviewFailureRow[]> => {
  return db
    .from(NOTE_REVIEW_FAILURES_TABLE)
    .whereNotNull('quarantined_at')
    .orderBy('quarantined_at', 'desc')
    .limit(limit)
    .select('note_id', 'attempts', 'last_error', 'last_attempt_at', 'quarantined_at')
}

export const countQuarantinedNotes = async (): Promise<number> => {
  const result = await db
    .from(NOTE_REVIEW_FAILURES_TABLE)
    .whereNotNull('quarantined_at')
    .count('* as total')
    .first()

  return Number(result?.total ?? 0)
}

/** Puts quarantined notes back in the queue, all of them or one by note id. */
export const releaseQuarantine = async (noteId?: string): Promise<number> => {
  const query = db.from(NOTE_REVIEW_FAILURES_TABLE).whereNotNull('quarantined_at')
  if (noteId) query.where('note_id', noteId)
  const result = await query.delete()
  return Number(Array.isArray(result) ? result[0] : result) || 0
}
