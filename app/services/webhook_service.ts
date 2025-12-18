import { practiceQConfig } from '#config/services'
import Session from '#models/session'
import Patient from '#models/patient'
import {
  SessionTypeEnum,
  AiStatusEnum,
  HumanReviewEnum,
  ManagerEnum,
  WorkflowEnum,
  PriorityEnum,
} from '#enums/session_enum'
import { DateTime } from 'luxon'
import type { WebhookJobData } from '#jobs/queues/webhook_queue'

export interface PracticeQNote {
  Id: string
  ClientId?: number
  [key: string]: any
}

// Helper function for delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper function to fetch PracticeQ note with retry mechanism
const fetchPracticeQNoteWithRetry = async (
  noteId: string,
  maxAttempts = 3,
  delayMs = 1000
): Promise<PracticeQNote | null> => {
  const PRACTICEQ_API_KEY = practiceQConfig.apiKey
  if (!PRACTICEQ_API_KEY) {
    throw new Error('PRACTICEQ_API_KEY is missing in environment variables')
  }

  let attempts = 0
  let lastError: any = null

  while (attempts < maxAttempts) {
    attempts++
    try {
      const response = await fetch(`${practiceQConfig.baseUrl}/notes/${noteId}`, {
        method: 'GET',
        headers: {
          'X-Auth-Key': PRACTICEQ_API_KEY,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`PracticeQ API error: ${response.status} ${response.statusText}`)
      }

      const noteDetails = (await response.json()) as PracticeQNote
      return noteDetails
    } catch (error: any) {
      lastError = error
      console.error(`Attempt ${attempts} failed to fetch note from PracticeQ: ${error.message}`)
      if (attempts < maxAttempts) {
        await sleep(delayMs * attempts) // Exponential backoff
      }
    }
  }
  throw new Error(
    `Failed to fetch note from PracticeQ after ${maxAttempts} attempts: ${lastError?.message}`
  )
}

/**
 * Process webhook job from BullMQ queue
 * Fetches note details from PracticeQ API and creates session in database
 */
export const processWebhookJob = async (jobData: WebhookJobData) => {
  const { NoteId: noteId, Type: type, ClientId: clientId } = jobData

  // Fetch note details from PracticeQ API with retry
  let noteDetails: PracticeQNote | null = null
  if (noteId) {
    noteDetails = await fetchPracticeQNoteWithRetry(noteId)
  }

  // Extract note content from Questions array if available
  let extractedNoteContent = ''
  if (noteDetails && 'Questions' in noteDetails && Array.isArray((noteDetails as any).Questions)) {
    const questions = (noteDetails as any).Questions

    extractedNoteContent = questions
      .map((q: any) => {
        if (q.Answer && q.Answer.trim()) {
          return `${q.Text || ''}: ${q.Answer}`
        }
        return null
      })
      .filter(Boolean)
      .join('\n\n')
  }

  // Create or find patient by client_id
  let patientId: number | null = null
  if (clientId) {
    const patient = await Patient.query().where('client_id', String(clientId)).first()
    if (patient) {
      patientId = patient.id
    }
  }

  // Avoid duplicate sessions for same note_id
  const existing = await Session.query()
    .where('note_id', noteId || '')
    .first()

  if (!existing && noteId) {
    const now = DateTime.now()
    await Session.create({
      noteId: noteId,
      sessionId: `session-${noteId}`,
      session: extractedNoteContent || '',
      sessionTime: now,
      practitionerId: 1, // default placeholder
      patientId: patientId,
      type: SessionTypeEnum.progress_note,
      aiScore: null,
      aiStatus: AiStatusEnum.not_reviewed,
      humanReview: HumanReviewEnum.pending,
      manager: ManagerEnum.pending,
      workflow: WorkflowEnum.in_queue,
      priority: PriorityEnum.medium,
      cptCodeId: null,
      reviewCycle: null,
    })
  }

  return {
    success: true,
    noteId,
    type,
    clientId,
    noteDetails: noteDetails ? { Id: noteDetails.Id } : null,
    extractedNoteContent: extractedNoteContent ? 'Content extracted' : null,
    patientId,
  }
}
