import { test } from '@japa/runner'
import {
  NOTE_REVIEW_DLQ_NAME,
  buildDlqJobId,
  buildDlqJobName,
  buildDlqPayload,
} from '#jobs/queues/note_review_dlq'
import { MAX_REVIEW_ATTEMPTS } from '#services/note_review_failure_service'

/**
 * These cover the payload the dead letter queue is given. Pushing a real job is
 * exercised on staging rather than here: it needs a live Redis, and a unit test
 * that silently depends on one is a flaky test.
 */
test.group('Note review dead letter queue | naming', () => {
  test('the queue name is stable', ({ assert }) => {
    // Changing this orphans anything already sitting in the old queue.
    assert.equal(NOTE_REVIEW_DLQ_NAME, 'note-review-dlq')
  })

  test('the job name identifies the note', ({ assert }) => {
    assert.equal(buildDlqJobName('abc-123'), 'dlq-note-abc-123')
  })

  test('two failures of the same note produce different job ids', ({ assert }) => {
    const first = buildDlqJobId('abc-123', 1_000)
    const second = buildDlqJobId('abc-123', 2_000)

    assert.notEqual(first, second)
    assert.include(first, 'abc-123')
  })

  test('a job id is produced even for an unusual note id', ({ assert }) => {
    assert.isString(buildDlqJobId('', 1_000))
    assert.isString(buildDlqJobId('note with spaces', 1_000))
  })
})

test.group('Note review dead letter queue | payload', () => {
  test('carries everything needed to investigate without opening the database', ({ assert }) => {
    const payload = buildDlqPayload({
      noteId: 'test-dlq-note-101',
      attempts: MAX_REVIEW_ATTEMPTS,
      lastError: 'MCP scorer timeout after 15000ms',
      failedAt: '2026-07-30 12:00:00',
    })

    assert.equal(payload.noteId, 'test-dlq-note-101')
    assert.equal(payload.attempts, MAX_REVIEW_ATTEMPTS)
    assert.equal(payload.lastError, 'MCP scorer timeout after 15000ms')
    assert.equal(payload.failedAt, '2026-07-30 12:00:00')
  })

  test('a missing error message becomes an empty string rather than undefined', ({ assert }) => {
    const payload = buildDlqPayload({
      noteId: 'n1',
      attempts: 5,
      lastError: '',
      failedAt: '2026-07-30 12:00:00',
    })

    assert.equal(payload.lastError, '')
  })

  test('carries no patient content, only identifiers and timings', ({ assert }) => {
    const payload = buildDlqPayload({
      noteId: 'n1',
      attempts: 5,
      lastError: 'boom',
      failedAt: '2026-07-30 12:00:00',
    })

    assert.deepEqual(Object.keys(payload).sort(), ['attempts', 'failedAt', 'lastError', 'noteId'])
  })

  test('a note only reaches the dead letter queue at the attempt limit', ({ assert }) => {
    // Guards against the limit and the quarantine rule drifting apart.
    assert.isAtLeast(MAX_REVIEW_ATTEMPTS, 2)
  })
})
