import { Queue } from 'bullmq'
import { redisConfig } from '#config/services'
import type { webhookSessionValidatorInterface } from '#validators/webhook_validator'

export const WEBHOOK_QUEUE_NAME = 'webhook-processing'

export interface WebhookJobData {
  payload: webhookSessionValidatorInterface
  receivedAt: string
}

export const webhookQueue = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, {
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

export const addWebhookJob = async (data: WebhookJobData) => {
  const job = await webhookQueue.add('process-webhook', data, {
    jobId: `webhook-${data.payload.NoteId}-${Date.now()}`,
  })
  return job
}
