import { Queue } from 'bullmq'
import { redisConfig } from '#config/services'

export const DISPATCH_EMAIL_QUEUE_NAME = 'dispatch-email'

export type DispatchEmailJobData = {
  practitionerEmail: string
  practitionerName: string
  notesWithIssues: Array<{
    noteId: string
    versionId: number | null
    versionLabel: string | null
    reviewerName: string
    clientId: string
    smeIssues: Array<{
      id: number
      errorType: string
      issuesRelatedTo: string
      issueDescription: string
      status: string
      createdAt: string
    }>
  }>
}

export const dispatchEmailQueue = new Queue<DispatchEmailJobData>(DISPATCH_EMAIL_QUEUE_NAME, {
  // Use an explicit keyPrefix to keep producer/worker aligned
  connection: { ...redisConfig, keyPrefix: '' },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 180000, // base delay 3 minutes between retries
    },
    removeOnComplete: true,
    removeOnFail: true,
  },
})

export const addDispatchEmailJob = async (data: DispatchEmailJobData) => {
  return dispatchEmailQueue.add('send-dispatch-email', data, {
    jobId: `dispatch-email-${Date.now()}-${data.practitionerEmail}`,
  })
}
