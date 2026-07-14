import { Worker, Job } from 'bullmq'
import { redisConfig } from '#config/services'
import { SESSION_CPT_QUEUE_NAME, type SessionCptJobData } from '#jobs/queues/session_cpt_queue'
import { updateSessionCptCodeBySessionId } from '#services/webhook_service'

let sessionCptWorker: Worker | null = null

export const startSessionCptWorker = () => {
  if (sessionCptWorker) {
    console.log('Session CPT worker already running')
    return sessionCptWorker
  }

  sessionCptWorker = new Worker<SessionCptJobData>(
    SESSION_CPT_QUEUE_NAME,
    async (job: Job<SessionCptJobData>) => {
      try {
        console.log(`Processing session CPT job ${job.id} for session id: ${job.data.sessionId}`)
        const result = await updateSessionCptCodeBySessionId(job.data.sessionId)
        console.log(
          `Session CPT job ${job.id} completed for session id: ${job.data.sessionId}`,
          result
        )
        return result
      } catch (error: any) {
        console.error(`Session CPT job ${job.id} failed:`, error.message)
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
    console.log(`Session CPT job ${job.id} has completed`)
  })

  sessionCptWorker.on('failed', (job, err) => {
    console.error(`Session CPT job ${job?.id} has failed with error: ${err.message}`)
  })

  sessionCptWorker.on('error', (err: any) => {
    if (err?.message?.includes?.('Missing key for job')) {
      return
    }
    console.error('Session CPT worker error:', err)
  })

  console.log('Session CPT worker started')
  return sessionCptWorker
}

export const stopSessionCptWorker = async () => {
  if (sessionCptWorker) {
    await sessionCptWorker.close()
    sessionCptWorker = null
    console.log('Session CPT worker stopped')
  }
}
