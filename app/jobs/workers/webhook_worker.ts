import { Worker, Job } from 'bullmq'
import { redisConfig } from '#config/services'
import { WEBHOOK_QUEUE_NAME, type WebhookJobData } from '#jobs/queues/webhook_queue'
import { createSessionFromWebhook } from '#services/webhook_service'

let webhookWorker: Worker | null = null

export const startWebhookWorker = () => {
  if (webhookWorker) {
    console.log('Webhook worker already running')
    return webhookWorker
  }

  webhookWorker = new Worker<WebhookJobData>(
    WEBHOOK_QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      try {
        // Reuse main-branch logic to create/update session in exact same format
        const result = await createSessionFromWebhook(job.data.payload)
        return result
      } catch (error: any) {
        console.error(`Webhook job ${job.id} failed:`, error.message)
        throw error
      }
    },
    {
      connection: redisConfig,
      concurrency: 5,
    }
  )

  webhookWorker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed`)
  })

  webhookWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} has failed with error: ${err.message}`)
  })

  webhookWorker.on('error', (err) => {
    console.error('Worker error:', err)
  })

  console.log('Webhook worker started')
  return webhookWorker
}

export const stopWebhookWorker = async () => {
  if (webhookWorker) {
    await webhookWorker.close()
    webhookWorker = null
    console.log('Webhook worker stopped')
  }
}
