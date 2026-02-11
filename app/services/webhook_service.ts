import Session from '#models/session'
import CptCode from '#models/cpt_code'
import User from '#models/user'
import Patient from '#models/patient'
import Agent from '#models/agent'
import Chat from '#models/chat'
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
import { createChat } from '#services/chat_service'

export const createSessionFromWebhook = async (payload: webhookSessionValidatorInterface) => {
  try {
    // Only process webhook if Status is "locked", otherwise silently ignore
    if (payload.Status === 'locked') {
      // Get CPT code 90791 (default for sessions)
      const cptCode = await CptCode.findBy('code', '90791')
      if (!cptCode) {
        throw new Error('CPT code 90791 not found. Please ensure CPT code seeder has been run.')
      }

      // Find or create practitioner by PractitionerEmail or PractitionerId
      let practitionerId: number | null = null

      // First, try to find by PractitionerEmail if provided
      if (payload.PractitionerEmail) {
        const practitionerByEmail = await User.query()
          .where('email', payload.PractitionerEmail)
          .where('type', UserTypeEnum.practitioner)
          .first()

        if (practitionerByEmail) {
          practitionerId = practitionerByEmail.id
        } else {
          // Create new practitioner if not found
          const newPractitioner = await User.create({
            email: payload.PractitionerEmail,
            fullName: payload.PractitionerName || null,
            type: UserTypeEnum.practitioner,
            isActive: true,
            password: null,
          })
          practitionerId = newPractitioner.id
        }
      } else if (payload.PractitionerId) {
        // Fallback to PractitionerId if email not provided
        const practitioner = await User.query()
          .where('type', UserTypeEnum.practitioner)
          .where('id', payload.PractitionerId)
          .first()

        if (practitioner) {
          practitionerId = practitioner.id
        }
      }

      if (!practitionerId) {
        throw new Error(
          `Practitioner not found. Please provide PractitionerEmail or valid PractitionerId.`
        )
      }

      // Find or create patient by ClientId
      let patientId: number | null = null
      if (payload.ClientId) {
        const clientIdString = String(payload.ClientId)
        const patient = await Patient.query().where('client_id', clientIdString).first()

        if (patient) {
          patientId = patient.id
        } else {
          // Create new patient if not found
          const newPatient = await Patient.create({
            clientId: clientIdString,
          })
          patientId = newPatient.id
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
        // Skip questions with missing text if not in fieldMapping
        if (!fieldName) {
          return
        }

        if (fieldName && question.answer) {
          sessionObject[fieldName] = question.answer
        } else if (
          fieldName &&
          (question.id.includes('optional') || (question.text?.includes('optional') ?? false))
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

      let session: Session

      // Update/create session with new JSON data
      // If version was stored (JSON changed), session will be updated with new data
      // If version was not stored (JSON same), session will still be updated to latest JSON
      if (existingSession) {
        // Update existing session with new session data
        existingSession.session = sessionString
        await existingSession.save()
        session = existingSession
      } else {
        // Create new session
        session = await Session.create({
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
      }

      // Automatically create chat with default prompt for AI evaluation
      // Create chat if: 1) Chat doesn't exist, OR 2) New version was stored (details changed)
      try {
        // Check if chat already exists for this note
        const existingChat = await Chat.query().where('note_id', payload.NoteId).first()

        // Create chat if: no chat exists OR new version was stored
        const shouldCreateChat = !existingChat || versionResult.stored

        if (shouldCreateChat) {
          // Find default active agent
          const defaultAgent = await Agent.query()
            .where('is_default', true)
            .where('is_active', true)
            .first()

          if (defaultAgent && defaultAgent.prompt && defaultAgent.model) {
            // Create chat with default agent for automatic evaluation
            // Pass the session instance we already have to avoid querying again
            await createChat(
              {
                note_id: payload.NoteId,
                prompt_id: defaultAgent.id,
              },
              practitionerId,
              session // Pass the session instance we already have
            )
          }
        }
      } catch (chatError: any) {
        // Log error but don't fail webhook processing
        console.log(`Error creating automatic chat for note ${payload.NoteId}:`, chatError.message)
      }

      return sendSuccess(
        existingSession
          ? 'Session updated successfully from webhook'
          : 'Session created successfully from webhook',
        {
          session: session,
          versionStored: versionResult.stored,
          versionMessage: versionResult.message,
        }
      )
    }

    // If Status is not "locked", silently ignore and return success
    return sendSuccess('Webhook received but not processed (Status is not locked)', {})
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
