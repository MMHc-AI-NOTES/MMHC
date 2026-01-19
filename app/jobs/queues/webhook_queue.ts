import { Queue } from 'bullmq'
import { redisConfig } from '#config/services'

export const WEBHOOK_QUEUE_NAME = 'webhook-processing'

export const webhookQueue = new Queue(WEBHOOK_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
})

export interface WebhookJobData {
  NoteId: string
  Type: string
  ClientId: number | null
  receivedAt: string
}

export const addWebhookJob = async (data: WebhookJobData) => {
  const job = await webhookQueue.add('process-webhook', data, {
    jobId: `webhook-${data.NoteId}-${Date.now()}`,
  })
  return job
}
