import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  CLAIM_OWNER,
  CLAIM_TTL_MINUTES,
  NoteReviewInProgressError,
  isDuplicateKeyError,
  isNoteReviewInProgressError,
  staleClaimCutoff,
} from '#services/note_review_claim_service'

/**
 * The claim is what stops the automatic sweep and the Re-run Audit button from
 * scoring the same note at once. The database work is exercised on staging;
 * these cover the decisions around it, which are where the bugs would hide.
 */

test.group('Note review claims | duplicate key detection', () => {
  test('recognises the mysql2 error code', ({ assert }) => {
    assert.isTrue(isDuplicateKeyError({ code: 'ER_DUP_ENTRY' }))
  })

  test('recognises the numeric errno', ({ assert }) => {
    assert.isTrue(isDuplicateKeyError({ errno: 1062 }))
  })

  test('recognises the message text as a last resort', ({ assert }) => {
    assert.isTrue(isDuplicateKeyError({ message: "Duplicate entry 'abc' for key 'note_id'" }))
  })

  test('does not mistake an unrelated database error for a claim collision', ({ assert }) => {
    // Getting this wrong would silently swallow a connection failure and make
    // the sweep believe another process holds the note.
    assert.isFalse(isDuplicateKeyError({ code: 'ECONNREFUSED' }))
    assert.isFalse(isDuplicateKeyError({ errno: 1146, message: 'Table does not exist' }))
    assert.isFalse(isDuplicateKeyError(new Error('connect ETIMEDOUT')))
  })

  test('handles null and undefined without throwing', ({ assert }) => {
    assert.isFalse(isDuplicateKeyError(null))
    assert.isFalse(isDuplicateKeyError(undefined))
    assert.isFalse(isDuplicateKeyError({}))
  })
})

test.group('Note review claims | stale cutoff', () => {
  const now = DateTime.fromISO('2026-07-30T12:00:00Z')

  test('a claim goes stale exactly one TTL in the past', ({ assert }) => {
    assert.equal(staleClaimCutoff(now).toISO(), now.minus({ minutes: CLAIM_TTL_MINUTES }).toISO())
  })

  test('the TTL is far longer than a healthy review', ({ assert }) => {
    // A review takes five to fifteen seconds. A TTL near that would let a slow
    // but healthy review have its note stolen mid flight.
    assert.isAbove(CLAIM_TTL_MINUTES * 60, 15 * 10)
  })

  test('the TTL is short enough that a crashed worker does not strand a note', ({ assert }) => {
    assert.isBelow(CLAIM_TTL_MINUTES, 60)
  })
})

test.group('Note review claims | owner identity', () => {
  test('the owner identifies this process', ({ assert }) => {
    assert.isString(CLAIM_OWNER)
    assert.include(CLAIM_OWNER, String(process.pid))
  })

  test('the owner is not just the pid, so a recycled pid cannot free a live claim', ({
    assert,
  }) => {
    assert.notEqual(CLAIM_OWNER, String(process.pid))
    assert.isAbove(CLAIM_OWNER.length, String(process.pid).length + 1)
  })
})

test.group('Note review claims | contention is not failure', () => {
  test('a contention error is recognisable', ({ assert }) => {
    assert.isTrue(isNoteReviewInProgressError(new NoteReviewInProgressError('note-1')))
  })

  test('a real review failure is not mistaken for contention', ({ assert }) => {
    // If this were wrong, a note that genuinely cannot be scored would never
    // reach quarantine and would be retried forever.
    assert.isFalse(isNoteReviewInProgressError(new Error('MCP scorer timeout')))
    assert.isFalse(isNoteReviewInProgressError('A review is already running for this note'))
    assert.isFalse(isNoteReviewInProgressError(null))
  })

  test('the error carries the note id for logging', ({ assert }) => {
    const error = new NoteReviewInProgressError('note-42')
    assert.equal(error.noteId, 'note-42')
    assert.equal(error.name, 'NoteReviewInProgressError')
  })
})
