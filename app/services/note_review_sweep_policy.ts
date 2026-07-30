/**
 * Sizing and scheduling rules for the automatic note review sweep.
 *
 * Kept separate from the worker so it can be imported without pulling in BullMQ,
 * which opens a Redis connection at module load.
 */

/**
 * How many notes one sweep will review. An MCP call takes roughly five to
 * fifteen seconds, so this bounds a run to well under the one minute interval
 * and keeps a backlog draining steadily rather than flooding the scorer.
 */
export const NOTES_PER_SWEEP = 10

/**
 * How many reviews run at once within a sweep. Five keeps the worst case
 * (fifteen seconds a note) at about thirty seconds, so a sweep finishes well
 * before the next one is due.
 */
export const CONCURRENCY = 5

/** How often the sweep runs. */
export const SWEEP_CRON = '* * * * *'

/** User the created review records are attributed to (system admin). */
export const SYSTEM_USER_ID = 1

/**
 * Runs `mapper` over `items` with at most `concurrency` in flight. Exported so
 * the bound can be tested directly: exceeding it would put unbounded load on
 * the scorer, and dropping below it would let a sweep overrun its interval.
 */
export const mapWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<void>
): Promise<void> => {
  const limit = Math.max(1, Math.floor(concurrency) || 1)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const index = nextIndex++
      if (index >= items.length) return
      await mapper(items[index])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}
