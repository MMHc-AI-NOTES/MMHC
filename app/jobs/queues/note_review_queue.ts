import { Queue } from 'bullmq'
import { redisConfig } from '#config/services'

export const NOTE_REVIEW_QUEUE_NAME = 'note-review-processing'

/** Job name for the repeatable sweep that reviews notes with no AI review yet. */
export const NOTE_REVIEW_SWEEP_JOB = 'sweep-unreviewed-notes'

/**
 * Runs every minute and reviews any note that does not have an AI review yet.
 * A repeating sweep rather than a trigger on ingestion, so it covers notes from
 * both the PracticeQ webhook and the MORF sync, and so a note whose review
 * fails is simply picked up again on the next run instead of being lost.
 */
export const noteReviewQueue = new Queue(NOTE_REVIEW_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    // One attempt only. If a sweep fails the next run covers the same notes,
    // so retrying here would just duplicate work.
    attempts: 1,
    removeOnComplete: 50,
    removeOnFail: 50,
  },
})

/**
 * Registers the repeating sweep. Safe to call on every boot: BullMQ keys a
 * repeatable job by name and pattern, so repeated registration does not create
 * duplicates. Older schedules under the same name are cleared first so a change
 * of interval takes effect on deploy.
 */
export const scheduleNoteReviewSweep = async (cron = '* * * * *') => {
  const existing = await noteReviewQueue.getRepeatableJobs()
  await Promise.all(
    existing
      .filter((job) => job.name === NOTE_REVIEW_SWEEP_JOB && job.pattern !== cron)
      .map((job) => noteReviewQueue.removeRepeatableByKey(job.key))
  )

  return noteReviewQueue.add(
    NOTE_REVIEW_SWEEP_JOB,
    {},
    {
      repeat: { pattern: cron },
      jobId: NOTE_REVIEW_SWEEP_JOB,
    }
  )
}
