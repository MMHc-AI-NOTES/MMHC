import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  CONCURRENCY,
  NOTES_PER_SWEEP,
  mapWithConcurrency,
} from '#services/note_review_sweep_policy'
import {
  MAX_ERROR_LENGTH,
  MAX_REVIEW_ATTEMPTS,
  backoffMinutesFor,
  normaliseErrorMessage,
  nextFailureState,
  shouldSkipNote,
  type NoteReviewFailureRow,
} from '#services/note_review_failure_service'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const failureRow = (overrides: Partial<NoteReviewFailureRow> = {}): NoteReviewFailureRow => ({
  note_id: 'note-1',
  attempts: 1,
  last_error: 'boom',
  last_attempt_at: null,
  quarantined_at: null,
  ...overrides,
})

/* -------------------------------------------------------------------------- */
/* Concurrency bound                                                           */
/* -------------------------------------------------------------------------- */

test.group('Note review sweep | concurrency', () => {
  test('processes every item exactly once', async ({ assert }) => {
    const items = Array.from({ length: 25 }, (_, index) => index)
    const seen: number[] = []

    await mapWithConcurrency(items, 3, async (item) => {
      seen.push(item)
    })

    assert.lengthOf(seen, 25)
    assert.deepEqual(
      [...seen].sort((a, b) => a - b),
      items
    )
  })

  test('never runs more than the configured number at once', async ({ assert }) => {
    let inFlight = 0
    let peak = 0

    await mapWithConcurrency(
      Array.from({ length: 12 }, (_, i) => i),
      3,
      async () => {
        inFlight++
        peak = Math.max(peak, inFlight)
        await delay(5)
        inFlight--
      }
    )

    assert.equal(peak, 3)
    assert.equal(inFlight, 0)
  })

  test('does not spawn workers for an empty batch', async ({ assert }) => {
    let calls = 0
    await mapWithConcurrency([], 5, async () => {
      calls++
    })
    assert.equal(calls, 0)
  })

  test('handles a batch smaller than the concurrency limit', async ({ assert }) => {
    const seen: number[] = []
    await mapWithConcurrency([1, 2], 10, async (item) => {
      seen.push(item)
    })
    assert.deepEqual(seen.sort(), [1, 2])
  })

  test('a concurrency of zero or less still makes progress', async ({ assert }) => {
    const seen: number[] = []
    await mapWithConcurrency([1, 2, 3], 0, async (item) => {
      seen.push(item)
    })
    assert.deepEqual(seen, [1, 2, 3])
  })

  test('a fractional concurrency is floored rather than rejected', async ({ assert }) => {
    let inFlight = 0
    let peak = 0

    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2.9, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await delay(5)
      inFlight--
    })

    assert.equal(peak, 2)
  })

  test('one failing item does not stop the rest when errors are caught', async ({ assert }) => {
    let reviewed = 0
    let failed = 0

    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      try {
        if (item === 3) throw new Error('MCP timeout')
        reviewed++
      } catch {
        failed++
      }
    })

    assert.equal(reviewed, 4)
    assert.equal(failed, 1)
  })

  test('an uncaught error rejects the whole sweep so BullMQ marks the job failed', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        mapWithConcurrency([1, 2, 3], 2, async (item) => {
          if (item === 2) throw new Error('unhandled')
        }),
      'unhandled'
    )
  })
})

/* -------------------------------------------------------------------------- */
/* Batch sizing                                                                */
/* -------------------------------------------------------------------------- */

test.group('Note review sweep | batching', () => {
  test('a backlog drains in whole batches across runs', ({ assert }) => {
    let remaining = 182 // the production backlog observed before this change
    let runs = 0

    while (remaining > 0) {
      remaining -= Math.min(NOTES_PER_SWEEP, remaining)
      runs++
    }

    assert.equal(runs, 19)
    assert.equal(remaining, 0)
  })

  test('a batch stays inside the one minute interval at fifteen seconds a note', ({ assert }) => {
    const worstCaseSecondsPerNote = 15
    const estimatedSeconds = Math.ceil(NOTES_PER_SWEEP / CONCURRENCY) * worstCaseSecondsPerNote

    assert.equal(estimatedSeconds, 30)
    assert.isBelow(estimatedSeconds, 60)
  })

  test('the batch is never smaller than the concurrency it feeds', ({ assert }) => {
    assert.isAtLeast(NOTES_PER_SWEEP, CONCURRENCY)
  })
})

/* -------------------------------------------------------------------------- */
/* Backoff schedule                                                            */
/* -------------------------------------------------------------------------- */

test.group('Note review failures | backoff', () => {
  test('backoff grows with each failed attempt', ({ assert }) => {
    assert.equal(backoffMinutesFor(1), 1)
    assert.equal(backoffMinutesFor(2), 5)
    assert.equal(backoffMinutesFor(3), 15)
    assert.equal(backoffMinutesFor(4), 60)
  })

  test('backoff is capped once past the schedule', ({ assert }) => {
    assert.equal(backoffMinutesFor(5), 60)
    assert.equal(backoffMinutesFor(500), 60)
  })

  test('backoff never returns undefined for odd inputs', ({ assert }) => {
    for (const input of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = backoffMinutesFor(input)
      assert.isNumber(result)
      assert.isAtLeast(result, 1)
    }
  })

  test('the schedule covers every attempt before quarantine', ({ assert }) => {
    // If the schedule ran out before the attempt limit a note would be retried
    // on an undefined delay, so the two have to stay in step.
    assert.isAtLeast(MAX_REVIEW_ATTEMPTS, 2)
    assert.equal(backoffMinutesFor(MAX_REVIEW_ATTEMPTS - 1), 60)
  })
})

/* -------------------------------------------------------------------------- */
/* Skip decision                                                               */
/* -------------------------------------------------------------------------- */

test.group('Note review failures | skip decision', () => {
  const now = DateTime.fromISO('2026-07-30T12:00:00Z')

  test('a quarantined note is always skipped', ({ assert }) => {
    assert.isTrue(
      shouldSkipNote(failureRow({ quarantined_at: now.minus({ days: 30 }).toJSDate() }), now)
    )
  })

  test('a note inside its backoff is skipped', ({ assert }) => {
    assert.isTrue(
      shouldSkipNote(
        failureRow({ attempts: 2, last_attempt_at: now.minus({ minutes: 1 }).toJSDate() }),
        now
      )
    )
  })

  test('a note past its backoff is retried', ({ assert }) => {
    assert.isFalse(
      shouldSkipNote(
        failureRow({ attempts: 2, last_attempt_at: now.minus({ minutes: 6 }).toJSDate() }),
        now
      )
    )
  })

  test('a note exactly at its backoff boundary is retried', ({ assert }) => {
    assert.isFalse(
      shouldSkipNote(
        failureRow({ attempts: 1, last_attempt_at: now.minus({ minutes: 1 }).toJSDate() }),
        now
      )
    )
  })

  test('a failure row with no attempt timestamp is retried', ({ assert }) => {
    assert.isFalse(shouldSkipNote(failureRow({ last_attempt_at: null }), now))
  })

  test('an unparseable attempt timestamp does not strand the note', ({ assert }) => {
    assert.isFalse(shouldSkipNote(failureRow({ last_attempt_at: 'not-a-date' }), now))
  })

  test('a string timestamp from MySQL is handled', ({ assert }) => {
    assert.isTrue(
      shouldSkipNote(failureRow({ attempts: 3, last_attempt_at: '2026-07-30T11:55:00Z' }), now)
    )
  })

  test('a clock skew putting the last attempt in the future still skips', ({ assert }) => {
    assert.isTrue(
      shouldSkipNote(
        failureRow({ attempts: 1, last_attempt_at: now.plus({ hours: 1 }).toJSDate() }),
        now
      )
    )
  })
})

/* -------------------------------------------------------------------------- */
/* Failure state transitions                                                   */
/* -------------------------------------------------------------------------- */

test.group('Note review failures | state transitions', () => {
  const now = DateTime.fromISO('2026-07-30T12:00:00Z')

  test('the first failure starts the attempt count at one', ({ assert }) => {
    const state = nextFailureState(null, new Error('scorer 503'), now)
    assert.equal(state.attempts, 1)
    assert.equal(state.last_error, 'scorer 503')
    assert.isNull(state.quarantined_at)
  })

  test('each further failure increments the attempt count', ({ assert }) => {
    assert.equal(nextFailureState({ attempts: 1 }, 'x', now).attempts, 2)
    assert.equal(nextFailureState({ attempts: 3 }, 'x', now).attempts, 4)
  })

  test('the note is quarantined on reaching the attempt limit', ({ assert }) => {
    const state = nextFailureState({ attempts: MAX_REVIEW_ATTEMPTS - 1 }, 'x', now)
    assert.equal(state.attempts, MAX_REVIEW_ATTEMPTS)
    assert.isNotNull(state.quarantined_at)
  })

  test('the note is not quarantined one attempt early', ({ assert }) => {
    const state = nextFailureState({ attempts: MAX_REVIEW_ATTEMPTS - 2 }, 'x', now)
    assert.isNull(state.quarantined_at)
  })

  test('a corrupt attempt count is treated as zero rather than propagated', ({ assert }) => {
    assert.equal(nextFailureState({ attempts: Number.NaN }, 'x', now).attempts, 1)
    assert.equal(nextFailureState({ attempts: -5 }, 'x', now).attempts, 1)
  })

  test('a poison note stops consuming batch slots after the attempt limit', ({ assert }) => {
    let state = nextFailureState(null, 'always fails', now)
    let sweepsAfterQuarantine = 0

    for (let sweep = 0; sweep < 100; sweep++) {
      if (state.quarantined_at) {
        sweepsAfterQuarantine++
        continue
      }
      state = nextFailureState({ attempts: state.attempts }, 'always fails', now)
    }

    assert.equal(state.attempts, MAX_REVIEW_ATTEMPTS)
    assert.isAbove(sweepsAfterQuarantine, 90)
  })
})

/* -------------------------------------------------------------------------- */
/* Error message handling                                                      */
/* -------------------------------------------------------------------------- */

test.group('Note review failures | error messages', () => {
  test('an Error is reduced to its message', ({ assert }) => {
    assert.equal(normaliseErrorMessage(new Error('  connect ETIMEDOUT  ')), 'connect ETIMEDOUT')
  })

  test('a plain string is kept', ({ assert }) => {
    assert.equal(normaliseErrorMessage('request failed'), 'request failed')
  })

  test('null and undefined become an empty string rather than the word null', ({ assert }) => {
    assert.equal(normaliseErrorMessage(null), '')
    assert.equal(normaliseErrorMessage(undefined), '')
  })

  test('a non string value is stringified', ({ assert }) => {
    assert.equal(normaliseErrorMessage(500), '500')
  })

  test('a very long message is truncated so one stack trace cannot bloat the row', ({ assert }) => {
    const message = normaliseErrorMessage('x'.repeat(MAX_ERROR_LENGTH + 5000))
    assert.lengthOf(message, MAX_ERROR_LENGTH)
  })

  test('an Error with no message does not throw', ({ assert }) => {
    assert.equal(normaliseErrorMessage(new Error()), '')
  })
})
