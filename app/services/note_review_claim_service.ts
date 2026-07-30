import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export const NOTE_REVIEW_CLAIMS_TABLE = 'note_review_claims'

/**
 * How long a claim is honoured before another process may take it. An MCP call
 * takes five to fifteen seconds, so ten minutes is far longer than any healthy
 * review and short enough that a crashed worker does not strand a note.
 */
export const CLAIM_TTL_MINUTES = 10

/** Identifies this process in the claims table. */
export const CLAIM_OWNER = `${process.pid}-${randomUUID().slice(0, 8)}`

/**
 * Raised when another process is already reviewing the note. This is a benign
 * collision, not a review failure, so it must not count toward quarantine.
 */
export class NoteReviewInProgressError extends Error {
  readonly noteId: string

  constructor(noteId: string) {
    super('A review is already running for this note')
    this.name = 'NoteReviewInProgressError'
    this.noteId = noteId
  }
}

export const isNoteReviewInProgressError = (error: unknown): boolean =>
  error instanceof NoteReviewInProgressError

/** MySQL duplicate key, meaning another process already holds the claim. */
export const isDuplicateKeyError = (error: any): boolean =>
  error?.code === 'ER_DUP_ENTRY' ||
  error?.errno === 1062 ||
  /duplicate entry/i.test(error?.message ?? '')

/** The moment before which a claim is considered abandoned. */
export const staleClaimCutoff = (now: DateTime): DateTime =>
  now.minus({ minutes: CLAIM_TTL_MINUTES })

/**
 * Takes an exclusive claim on a note for the duration of one review. Returns
 * false when another live process already holds it, in which case the caller
 * must not score the note.
 */
export const claimNote = async (
  noteId: string,
  owner: string = CLAIM_OWNER,
  now: DateTime = DateTime.now()
): Promise<boolean> => {
  const timestamp = now.toSQL({ includeOffset: false })

  try {
    await db.table(NOTE_REVIEW_CLAIMS_TABLE).insert({
      note_id: noteId,
      claimed_by: owner,
      claimed_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    })
    return true
  } catch (error: any) {
    if (!isDuplicateKeyError(error)) throw error

    // Someone holds it. Take it over only if their claim has gone stale, and
    // do it as a single conditional update so two processes racing to reclaim
    // the same abandoned note cannot both win.
    const reclaimed = await db
      .from(NOTE_REVIEW_CLAIMS_TABLE)
      .where('note_id', noteId)
      .where('claimed_at', '<', staleClaimCutoff(now).toSQL({ includeOffset: false })!)
      .update({ claimed_by: owner, claimed_at: timestamp, updated_at: timestamp })

    return Number(reclaimed) > 0
  }
}

/** Releases a claim. Only the holder can release it. */
export const releaseNote = async (noteId: string, owner: string = CLAIM_OWNER): Promise<void> => {
  await db
    .from(NOTE_REVIEW_CLAIMS_TABLE)
    .where('note_id', noteId)
    .where('claimed_by', owner)
    .delete()
}

/** Removes abandoned claims. Called at the start of each sweep. */
export const clearStaleClaims = async (now: DateTime = DateTime.now()): Promise<number> => {
  const result = await db
    .from(NOTE_REVIEW_CLAIMS_TABLE)
    .where('claimed_at', '<', staleClaimCutoff(now).toSQL({ includeOffset: false })!)
    .delete()

  return Number(Array.isArray(result) ? result[0] : result) || 0
}

/** Note ids currently claimed by any process. */
export const getClaimedNoteIds = async (): Promise<string[]> => {
  const rows = await db.from(NOTE_REVIEW_CLAIMS_TABLE).select('note_id')
  return rows.map((row) => row.note_id)
}
