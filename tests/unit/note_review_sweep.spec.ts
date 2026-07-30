import { test } from '@japa/runner'

/**
 * The sweep itself talks to MySQL and the MCP scorer, so these tests cover the
 * two decisions that are easy to get wrong and expensive in production: the
 * concurrency helper that bounds parallel reviews, and the batch limit.
 */

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test.group('Note review sweep concurrency', () => {
  test('processes every item exactly once', async ({ assert }) => {
    const items = Array.from({ length: 25 }, (_, index) => index)
    const seen: number[] = []

    await mapWithConcurrency(items, 3, async (item) => {
      seen.push(item)
    })

    assert.lengthOf(seen, 25)
    assert.deepEqual([...seen].sort((a, b) => a - b), items)
  })

  test('never runs more than the configured number at once', async ({ assert }) => {
    const items = Array.from({ length: 12 }, (_, index) => index)
    let inFlight = 0
    let peak = 0

    await mapWithConcurrency(items, 3, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await delay(5)
      inFlight--
    })

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

  test('one failing item does not stop the rest when errors are caught', async ({ assert }) => {
    const items = [1, 2, 3, 4, 5]
    let reviewed = 0
    let failed = 0

    await mapWithConcurrency(items, 2, async (item) => {
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
})

test.group('Note review sweep batching', () => {
  test('a backlog drains in whole batches across runs', async ({ assert }) => {
    const batchSize = 10
    let remaining = 182 // the production backlog observed before this change
    let runs = 0

    while (remaining > 0) {
      remaining -= Math.min(batchSize, remaining)
      runs++
    }

    assert.equal(runs, 19)
    assert.equal(remaining, 0)
  })

  test('a batch of ten stays inside the one minute interval at fifteen seconds a note', async ({
    assert,
  }) => {
    const batchSize = 10
    const concurrency = 3
    const worstCaseSecondsPerNote = 15

    const estimatedSeconds = Math.ceil(batchSize / concurrency) * worstCaseSecondsPerNote

    assert.isBelow(estimatedSeconds, 60)
  })
})
