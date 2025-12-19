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
import { sendMissingFieldsEmail } from '#services/email_service'

export interface PracticeQNote {
  Id: string
  ClientId?: number
  [key: string]: any
}

/**
 * Validate webhook payload keys
 * Required keys: NoteId
 * Optional keys: Type, ClientId
 * @returns {isValid: boolean, errors: string[]}
 */
const validateWebhookKeys = (jobData: WebhookJobData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!jobData.NoteId || typeof jobData.NoteId !== 'string' || jobData.NoteId.trim().length === 0) {
    errors.push('NoteId is required and must be a non-empty string')
  }

  if (jobData.Type !== undefined && jobData.Type !== null) {
    if (typeof jobData.Type !== 'string' || jobData.Type.trim().length === 0) {
      errors.push('Type must be a non-empty string if provided')
    }
  }

  if (jobData.ClientId !== undefined && jobData.ClientId !== null) {
    if (typeof jobData.ClientId !== 'number' || !Number.isInteger(jobData.ClientId)) {
      errors.push('ClientId must be a valid integer if provided')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Required question texts that must be present in the Questions array
 * These questions must exist with non-empty answers
 */
const REQUIRED_QUESTIONS = [
  'Client First Name:',
  'Client Last Name:',
  'Client DOB:',
  'Client Mobile Phone:',
  '5th question',
]

/**
 * Validate note details Questions array
 * Checks if all 5 required questions are present with non-empty answers
 * @returns {isValid: boolean, errors: string[]}
 */
const validateNoteQuestions = (
  noteDetails: PracticeQNote | null
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!noteDetails) {
    errors.push('Note details not found')
    return { isValid: false, errors }
  }

  if (!('Questions' in noteDetails) || !Array.isArray((noteDetails as any).Questions)) {
    errors.push('Questions array not found in note details')
    return { isValid: false, errors }
  }

  const questions = (noteDetails as any).Questions

  const questionsWithAnswers = questions.filter(
    (q: any) => q.Text && q.Answer && typeof q.Answer === 'string' && q.Answer.trim().length > 0
  )

  const foundRequiredQuestions: string[] = []
  const missingRequiredQuestions: string[] = []

  REQUIRED_QUESTIONS.forEach((requiredText) => {
    const found = questionsWithAnswers.some(
      (q: any) => q.Text && q.Text.trim() === requiredText.trim()
    )
    if (found) {
      foundRequiredQuestions.push(requiredText)
    } else {
      missingRequiredQuestions.push(requiredText)
    }
  })

  if (missingRequiredQuestions.length > 0) {
    errors.push(
      `Missing required questions: ${missingRequiredQuestions.join(', ')}. Found: ${foundRequiredQuestions.join(', ')}`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
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
        await sleep(delayMs * attempts)
      }
    }
  }
  throw new Error(
    `Failed to fetch note from PracticeQ after ${maxAttempts} attempts: ${lastError?.message}`
  )
}

/**
 * Process webhook job from BullMQ queue
 * Validates webhook keys, fetches note details from PracticeQ API and creates session in database
 * Sets workflow to "in_queue" if validation passes, "failed" if validation fails
 */
export const processWebhookJob = async (jobData: WebhookJobData) => {
  const { NoteId: noteId, Type: type, ClientId: clientId } = jobData

  const webhookValidation = validateWebhookKeys(jobData)
  let workflowStatus = WorkflowEnum.in_queue

  if (!webhookValidation.isValid) {
    workflowStatus = WorkflowEnum.failed
  }

  let noteDetails: PracticeQNote | null = null
  let questionsValidation: { isValid: boolean; errors: string[] } | null = null
  if (webhookValidation.isValid && noteId) {
    try {
      noteDetails = await fetchPracticeQNoteWithRetry(noteId)
      questionsValidation = validateNoteQuestions(noteDetails)
      if (!questionsValidation.isValid) {
        workflowStatus = WorkflowEnum.failed
      }
    } catch (error: any) {
      workflowStatus = WorkflowEnum.failed
    }
  }

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

  let patientId: number | null = null
  if (clientId) {
    const patient = await Patient.query().where('client_id', String(clientId)).first()
    if (patient) {
      patientId = patient.id
    }
  }

  const existing = await Session.query()
    .where('note_id', noteId || '')
    .preload('practitioner')
    .first()

  let session: Session | null = null

  if (!existing && noteId) {
    const now = DateTime.now()
    session = await Session.create({
      noteId: noteId,
      sessionId: `session-${noteId}`,
      session: extractedNoteContent || '',
      sessionTime: now,
      practitionerId: 1,
      patientId: patientId,
      type: SessionTypeEnum.progress_note,
      aiScore: null,
      aiStatus: AiStatusEnum.not_reviewed,
      humanReview: HumanReviewEnum.pending,
      manager: ManagerEnum.pending,
      workflow: workflowStatus,
      priority: PriorityEnum.medium,
      cptCodeId: null,
      reviewCycle: null,
    })
    await session.load('practitioner')
  } else if (existing) {
    session = existing
    if (workflowStatus === WorkflowEnum.failed) {
      await existing.merge({ workflow: workflowStatus }).save()
    }
  }

  if (workflowStatus === WorkflowEnum.failed && session?.practitioner) {
    try {
      const practitioner = session.practitioner
      const practitionerName = practitioner.fullName || practitioner.email || 'Practitioner'
      const practitionerEmail = practitioner.email

      const missingFields: string[] = []
      if (questionsValidation && !questionsValidation.isValid) {
        questionsValidation.errors
          .filter((error) => error.includes('Missing required questions'))
          .forEach((error) => {
            const match = error.match(/Missing required questions: (.+?)(?:\. Found:|$)/)
            if (match) {
              const missingQuestions = match[1].split(', ').map((q) => q.trim())
              missingFields.push(...missingQuestions)
            }
          })
      }

      if (practitionerEmail) {
        await sendMissingFieldsEmail(practitionerEmail, practitionerName, missingFields, noteId)
      }
    } catch (error: any) {
      // Email sending failed, but don't break the process
    }
  }

  const allValidationErrors = [...webhookValidation.errors]
  if (questionsValidation && !questionsValidation.isValid) {
    allValidationErrors.push(...questionsValidation.errors)
  }

  return {
    success: workflowStatus === WorkflowEnum.in_queue,
    noteId,
    type,
    clientId,
    workflow: workflowStatus === WorkflowEnum.in_queue ? 'in_queue' : 'failed',
    validationErrors: allValidationErrors,
    noteDetails: noteDetails ? { Id: noteDetails.Id } : null,
    extractedNoteContent: extractedNoteContent ? 'Content extracted' : null,
    patientId,
  }
}
