import { Worker, Job } from 'bullmq'
import { redisConfig } from '#config/services'
import { WEBHOOK_QUEUE_NAME, type WebhookJobData } from '#jobs/queues/webhook_queue'
import { processWebhookJob } from '#services/webhook_service'
import logger from '@adonisjs/core/services/logger'

let webhookWorker: Worker | null = null

export const startWebhookWorker = () => {
  if (webhookWorker) {
    logger.info('Webhook worker already running')
    return webhookWorker
  }

  webhookWorker = new Worker<WebhookJobData>(
    WEBHOOK_QUEUE_NAME,
    async (job: Job<WebhookJobData>) => {
      try {
        logger.info(`Processing webhook job ${job.id} for note: ${job.data.payload.NoteId}`)
        // Process webhook job from queue
        const result = await processWebhookJob(job.data)
        logger.info(
          `Webhook job ${job.id} completed successfully for note: ${job.data.payload.NoteId}`
        )
        return result
      } catch (error: any) {
        logger.error(`Webhook job ${job.id} failed:`, error.message)
        logger.error('Full error:', error)
        throw error
      }
    },
    {
      connection: redisConfig,
      concurrency: 5,
      lockDuration: 120000,
    }
  )

  webhookWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} has completed`)
  })

  webhookWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} has failed with error: ${err.message}`)
  })

  webhookWorker.on('error', (err: any) => {
    if (err?.message?.includes?.('Missing key for job')) {
      return
    }
    logger.error('Worker error:', err)
  })

  logger.info('Webhook worker started')
  return webhookWorker
}

export const stopWebhookWorker = async () => {
  if (webhookWorker) {
    await webhookWorker.close()
    webhookWorker = null
    logger.info('Webhook worker stopped')
  }
}
