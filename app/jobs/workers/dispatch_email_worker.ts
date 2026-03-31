import { Worker, Job } from 'bullmq'
import { redisConfig } from '#config/services'
import {
  DISPATCH_EMAIL_QUEUE_NAME,
  type DispatchEmailJobData,
} from '#jobs/queues/dispatch_email_queue'
import { performBulkPractitionerSmeIssuesEmail } from '#services/email_service'

let dispatchEmailWorker: Worker | null = null

export const startDispatchEmailWorker = () => {
  if (dispatchEmailWorker) {
    return dispatchEmailWorker
  }

  dispatchEmailWorker = new Worker<DispatchEmailJobData>(
    DISPATCH_EMAIL_QUEUE_NAME,
    async (job: Job<DispatchEmailJobData>) => {
      try {
        return await performBulkPractitionerSmeIssuesEmail(job.data)
      } catch (error: any) {
        throw error
      }
    },
    {
      // Align keyPrefix with queue to avoid mixed prefixes in Redis
      connection: { ...redisConfig, keyPrefix: '' },
      concurrency: 3,
    }
  )
  return dispatchEmailWorker
}

export const stopDispatchEmailWorker = async () => {
  if (dispatchEmailWorker) {
    await dispatchEmailWorker.close()
    dispatchEmailWorker = null
  }
}
