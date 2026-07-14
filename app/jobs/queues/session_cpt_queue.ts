import { Queue } from 'bullmq'
import { redisConfig } from '#config/services'

export const SESSION_CPT_QUEUE_NAME = 'session-cpt-processing'

export interface SessionCptJobData {
  sessionId: number
}

export const sessionCptQueue = new Queue<SessionCptJobData>(SESSION_CPT_QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: true,
  },
})

export const addSessionCptJob = async (data: SessionCptJobData) => {
  const job = await sessionCptQueue.add('process-session-cpt', data, {
    jobId: `session-cpt-${data.sessionId}-${Date.now()}`,
  })
  return job
}
