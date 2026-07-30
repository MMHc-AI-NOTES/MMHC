import { test } from '@japa/runner'
import { pushToNoteReviewDlq, NOTE_REVIEW_DLQ_NAME } from '#jobs/queues/note_review_dlq'

test.group('Note Review Dead Letter Queue (DLQ)', () => {
  test('NOTE_REVIEW_DLQ_NAME constant is correctly defined', ({ assert }) => {
    assert.equal(NOTE_REVIEW_DLQ_NAME, 'note-review-dlq')
  })

  test('pushToNoteReviewDlq creates a job with correct payload structure', async ({ assert }) => {
    const payload = {
      noteId: 'test-dlq-note-101',
      attempts: 5,
      lastError: 'MCP Scorer timeout after 15000ms',
      failedAt: new Date().toISOString(),
    }

    const job = await pushToNoteReviewDlq(payload)
    assert.exists(job)
    assert.equal(job?.data.noteId, 'test-dlq-note-101')
    assert.equal(job?.data.attempts, 5)
    assert.equal(job?.data.lastError, 'MCP Scorer timeout after 15000ms')
  })
})
