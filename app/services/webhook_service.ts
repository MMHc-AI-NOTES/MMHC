import Session from '#models/session'
import CptCode from '#models/cpt_code'
import User from '#models/user'
import Patient from '#models/patient'
import {
  SessionTypeEnum,
  AiStatusEnum,
  HumanReviewEnum,
  ManagerEnum,
  WorkflowEnum,
  PriorityEnum,
} from '#enums/session_enum'
import { UserTypeEnum } from '#enums/user_type_enum'
import { sendSuccess } from '#services/custom_response_service'
import type { webhookSessionValidatorInterface } from '#validators/webhook_validator'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'
import { storeWebhookSessionVersionIfDifferent } from '#services/json_comparison_service'
import { practiceQConfig } from '#config/services'
import { DateTime } from 'luxon'
import type { WebhookJobData } from '#jobs/queues/webhook_queue'
import { sendMissingFieldsEmail } from '#services/email_service'

export const createSessionFromWebhook = async (payload: webhookSessionValidatorInterface) => {
  try {
    // Only process webhook if Status is "locked", otherwise silently ignore
    if (payload.Status !== 'locked') {
      // Get CPT code 90791 (default for sessions)
      const cptCode = await CptCode.findBy('code', '90791')
      if (!cptCode) {
        throw new Error('CPT code 90791 not found. Please ensure CPT code seeder has been run.')
      }

      // Find practitioner by PractitionerId (ID-based only)
      let practitionerId: number | null = null
      if (payload.PractitionerId) {
        const practitioner = await User.query()
          .where('type', UserTypeEnum.practitioner)
          .where('id', payload.PractitionerId)
          .first()

        if (practitioner) {
          practitionerId = practitioner.id
        }
      }

      if (!practitionerId) {
        throw new Error(`Practitioner not found for id: ${payload.PractitionerId || 'N/A'}`)
      }

      // Find patient by ClientId
      let patientId: number | null = null
      if (payload.ClientId) {
        const patient = await Patient.query().where('client_id', payload.ClientId).first()
        if (patient) {
          patientId = patient.id
        }
      }

      // Map Questions array to session object format
      const sessionObject: Record<string, string> = {}
      payload.Questions.forEach((question) => {
        // Map question IDs to session field names
        const fieldMapping: Record<string, string> = {
          'p9m9-1': 'Session Duration',
          '1hye-1': 'Mental Status (optional)',
          'kxgx-7': 'Suicidality',
          'kxgx-8': 'Homicidality',
          '6tx9-1': 'Subjective',
          'rb2f-1': 'Objective',
          'zad8-1': 'Assessment & Therapeutic Intervention',
          'ugq6-1': 'Reaction to Intervention',
          'hnfi-1': 'Plan and Collaboration',
          '9z5t-1': 'Therapist Reflection and Insight (optional)',
          'gm4p-1': 'Progress',
          '4lbp-1': 'Therapist Initials',
        }

        const fieldName = fieldMapping[question.id] || question.text
        if (fieldName && question.answer) {
          sessionObject[fieldName] = question.answer
        } else if (
          fieldName &&
          (question.id.includes('optional') || question.text.includes('optional'))
        ) {
          // Include optional fields even if empty
          sessionObject[fieldName] = ''
        }
      })

      // Convert session object to JSON string
      const sessionString = JSON.stringify(sessionObject)

      // Store webhook session version if JSON is different from previous
      const versionResult = await storeWebhookSessionVersionIfDifferent(
        payload.NoteId,
        sessionObject
      )

      // Generate sessionId from NoteId (use NoteId as sessionId or create pattern)
      const sessionId = `session-${payload.NoteId.substring(0, 8)}`

      // Check if session already exists
      const existingSession = await Session.query()
        .where('note_id', payload.NoteId)
        .orWhere('session_id', sessionId)
        .first()

      // Update/create session with new JSON data
      // If version was stored (JSON changed), session will be updated with new data
      // If version was not stored (JSON same), session will still be updated to latest JSON
      if (existingSession) {
        // Update existing session with new session data
        existingSession.session = sessionString
        await existingSession.save()

        return sendSuccess('Session updated successfully from webhook', {
          session: existingSession,
          versionStored: versionResult.stored,
          versionMessage: versionResult.message,
        })
      }

      // Create new session
      const session = await Session.create({
        noteId: payload.NoteId,
        sessionId: sessionId,
        session: sessionString,
        practitionerId: practitionerId,
        patientId: patientId,
        type: SessionTypeEnum.intake,
        cptCodeId: cptCode.id,
        aiScore: null,
        aiStatus: AiStatusEnum.not_reviewed,
        humanReview: HumanReviewEnum.pending,
        manager: ManagerEnum.pending,
        workflow: WorkflowEnum.in_queue,
        priority: PriorityEnum.low,
        reviewCycle: ReviewCycleEnum.cycle_1_of_3,
      })

      return sendSuccess('Session created successfully from webhook', {
        session: session,
        versionStored: versionResult.stored,
        versionMessage: versionResult.message,
      })
    }
  } catch (error: any) {
    console.log('Error in createSessionFromWebhook:', error.message)
    throw error
  }
}

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
