import type { Queue } from 'bullmq'
import { webhookQueue } from '#jobs/queues/webhook_queue'
import { sessionCptQueue } from '#jobs/queues/session_cpt_queue'
import { dispatchEmailQueue } from '#jobs/queues/dispatch_email_queue'
import { noteReviewQueue, NOTE_REVIEW_SWEEP_JOB } from '#jobs/queues/note_review_queue'
import { noteReviewDlq } from '#jobs/queues/note_review_dlq'
import { getQuarantinedNotes, MAX_REVIEW_ATTEMPTS } from '#services/note_review_failure_service'

export interface QueueJobSummary {
  id: string | null
  name: string
  state: string
  attempts: number
  createdAt: string | null
  finishedAt: string | null
  durationMs: number | null
  result: unknown
  failedReason: string | null
}

export interface QueueSummary {
  name: string
  label: string
  counts: Record<string, number>
  workers: number
  paused: boolean
  nextRunAt: string | null
  recentJobs: QueueJobSummary[]
}

const QUEUES: { queue: Queue; label: string }[] = [
  { queue: noteReviewQueue, label: 'Automatic note review' },
  { queue: noteReviewDlq, label: 'Note review dead letter queue' },
  { queue: webhookQueue, label: 'Webhook ingestion' },
  { queue: sessionCptQueue, label: 'Session CPT codes' },
  { queue: dispatchEmailQueue, label: 'Email dispatch' },
]

const RECENT_JOBS_PER_QUEUE = 15

const toIso = (value: number | undefined | null): string | null =>
  typeof value === 'number' && value > 0 ? new Date(value).toISOString() : null

const summariseJobs = async (queue: Queue): Promise<QueueJobSummary[]> => {
  const jobs = [
    ...(await queue.getJobs(['active'], 0, RECENT_JOBS_PER_QUEUE)),
    ...(await queue.getJobs(['completed', 'failed'], 0, RECENT_JOBS_PER_QUEUE)),
  ]

  const summaries = await Promise.all(
    jobs.map(async (job) => {
      const state = await job.getState()
      return {
        id: job.id ?? null,
        name: job.name,
        state,
        attempts: job.attemptsMade,
        createdAt: toIso(job.timestamp),
        finishedAt: toIso(job.finishedOn),
        durationMs:
          job.processedOn && job.finishedOn ? job.finishedOn - job.processedOn : null,
        result: job.returnvalue ?? null,
        failedReason: job.failedReason ?? null,
      }
    })
  )

  return summaries
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, RECENT_JOBS_PER_QUEUE)
}

/** When the next automatic sweep is due, so a stalled schedule is visible. */
const nextSweepAt = async (queue: Queue): Promise<string | null> => {
  const repeatables = await queue.getRepeatableJobs()
  const sweep = repeatables.find((job) => job.name === NOTE_REVIEW_SWEEP_JOB)
  return sweep ? toIso(sweep.next) : null
}

export interface QuarantinedNoteSummary {
  noteId: string
  attempts: number
  lastError: string | null
  quarantinedAt: string | null
}

/**
 * Notes the automatic review gave up on after MAX_REVIEW_ATTEMPTS. This is the
 * equivalent of a dead letter queue for this design: the sweep derives its work
 * from the database rather than from job payloads, so a failed note is never
 * lost, but it does need somewhere visible to land once retrying is pointless.
 */
export const getQuarantineSummary = async (): Promise<{
  maxAttempts: number
  notes: QuarantinedNoteSummary[]
}> => {
  const rows = await getQuarantinedNotes()

  return {
    maxAttempts: MAX_REVIEW_ATTEMPTS,
    notes: rows.map((row) => ({
      noteId: row.note_id,
      attempts: row.attempts,
      lastError: row.last_error,
      quarantinedAt: row.quarantined_at ? new Date(row.quarantined_at).toISOString() : null,
    })),
  }
}

export const getQueueSummaries = async (): Promise<QueueSummary[]> => {
  return Promise.all(
    QUEUES.map(async ({ queue, label }) => ({
      name: queue.name,
      label,
      counts: await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused'
      ),
      workers: (await queue.getWorkers()).length,
      paused: await queue.isPaused(),
      nextRunAt: queue.name === noteReviewQueue.name ? await nextSweepAt(queue) : null,
      recentJobs: await summariseJobs(queue),
    }))
  )
}
