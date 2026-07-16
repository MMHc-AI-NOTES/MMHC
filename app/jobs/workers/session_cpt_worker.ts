import { Worker, Job } from 'bullmq'
import { redisConfig } from '#config/services'
import { SESSION_CPT_QUEUE_NAME, type SessionCptJobData } from '#jobs/queues/session_cpt_queue'
import { updateSessionCptCodeBySessionId } from '#services/webhook_service'
import logger from '@adonisjs/core/services/logger'

let sessionCptWorker: Worker | null = null
let redisFailureHandled = false

export const startSessionCptWorker = () => {
  if (sessionCptWorker) {
    logger.info('Session CPT worker already running')
    return sessionCptWorker
  }

  sessionCptWorker = new Worker<SessionCptJobData>(
    SESSION_CPT_QUEUE_NAME,
    async (job: Job<SessionCptJobData>) => {
      try {
        logger.info(`Processing session CPT job ${job.id} for session id: ${job.data.sessionId}`)
        const result = await updateSessionCptCodeBySessionId(job.data.sessionId)
        logger.info(
          `Session CPT job ${job.id} completed for session id: ${job.data.sessionId}`,
          result
        )
        return result
      } catch (error: any) {
        logger.error(`Session CPT job ${job.id} failed:`, error.message)
        throw error
      }
    },
    {
      connection: redisConfig,
      concurrency: 3,
      lockDuration: 120000,
    }
  )

  sessionCptWorker.on('completed', (job) => {
    logger.info(`Session CPT job ${job.id} has completed`)
  })

  sessionCptWorker.on('failed', (job, err) => {
    logger.error(`Session CPT job ${job?.id} has failed with error: ${err.message}`)
  })

  sessionCptWorker.on('error', (err: any) => {
    if (err?.message?.includes?.('Missing key for job')) {
      return
    }
    logger.error('Session CPT worker error:', err)

    // Let ECS restart the task when Redis is unavailable or authentication
    // fails. Keeping the process alive here prevents the ECS service from
    // recovering after a Redis outage or secret rotation.
    if (!redisFailureHandled) {
      redisFailureHandled = true
      void stopSessionCptWorker().finally(() => process.exit(1))
    }
  })

  logger.info('Session CPT worker started')
  return sessionCptWorker
}

export const stopSessionCptWorker = async () => {
  if (sessionCptWorker) {
    await sessionCptWorker.close()
    sessionCptWorker = null
    redisFailureHandled = false
    logger.info('Session CPT worker stopped')
  }
}
