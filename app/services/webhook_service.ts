import Session from '#models/session'
import CptCode from '#models/cpt_code'
import User from '#models/user'
import Patient from '#models/patient'
import Agent from '#models/agent'
import Chat from '#models/chat'
import WebhookSessionVersion from '#models/webhook_session_version'
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

/**
 * Field mapping: question id → canonical session field name.
 * Covers both MORF-style IDs and webhook payload IDs (e.g. Progress Note).
 */
const FIELD_MAPPING: Record<string, string> = {
  // MORF / legacy
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
  // Progress Note / webhook payload (same input shape)
  'p46w-1': 'First Name:',
  'p46w-2': 'Last Name:',
  'p46w-3': 'Date of Birth:',
  'g39u-1': 'Session Duration',
  'd1zt-1': 'Encounter Type & Method',
  'cupi-1': 'Mental Status (optional)',
  'br4k-1': 'Suicidality',
  'br4k-2': 'Homicidality',
  'ujky-1': 'Subjective',
  'k8nq-1': 'Objective',
  'nbli-1': 'Assessment & Therapeutic Intervention',
  'm5uu-1': 'Reaction to Intervention',
  'u3jf-1': 'Plan and Collaboration',
  'x1gq-1': 'Therapist Reflection and Insight (optional)',
  'cpb1-1': 'Progress',
  'zqpc-1': 'Full Name & Credentials (Signature)',
  'zqpc-2': 'Date Completed',
  '5r6o-1': 'Documented by Supervised Clinician (if applicable)',
}

function getSessionTimeFromPayload(payload: webhookSessionValidatorInterface): DateTime {
  const dateStr = payload.Date ?? (payload as any).LastModified
  if (dateStr && typeof dateStr === 'string') {
    const parsed = DateTime.fromISO(dateStr, { setZone: true })
    if (parsed.isValid) return parsed
  }
  const et = payload.EventTime ?? (payload as any).EventTimestamp
  if (et && typeof et === 'object' && typeof (et as any).seconds === 'number') {
    const s = (et as any).seconds
    const ns = (et as any).nanoseconds ?? 0
    return DateTime.fromMillis(s * 1000 + ns / 1e6)
  }
  return DateTime.now()
}

/**
 * Webhook flow (parent-child method):
 * 1. Use ClientId to resolve patient (find or create).
 * 2. If this NoteId already exists in DB: update session; compare with latest version,
 *    and create new version only if content is different.
 * 3. If this NoteId does not exist: create new note (session). This new note is the
 *    latest for the client (parent_note_id = null). Update this client's previous
 *    "latest" note: set its parent_note_id = this new note's id.
 */
export const createSessionFromWebhook = async (payload: webhookSessionValidatorInterface) => {
  const noteId = payload.NoteId
  console.log('[Webhook] Processing started', { noteId })

  try {
    // Get CPT code 90791 (default for sessions)
    const cptCode = await CptCode.findBy('code', '90791')
    if (!cptCode) {
      throw new Error('CPT code 90791 not found. Please ensure CPT code seeder has been run.')
    }

    // Find or create practitioner by PractitionerEmail or PractitionerId
    let practitionerId: number | null = null

    // First, try to find by PractitionerEmail if provided (any user with this email)
    if (payload.PractitionerEmail) {
      const practitionerByEmail = await User.query()
        .where('email', payload.PractitionerEmail)
        .first()

      if (practitionerByEmail) {
        practitionerId = practitionerByEmail.id
      } else {
        // Create new practitioner only if no user exists with this email
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
      const pidStr = String(payload.PractitionerId).trim()
      // Try by pq_id first (MORF-style), then by numeric id
      const byPqId = await User.query().where('pq_id', pidStr).first()
      if (byPqId) {
        practitionerId = byPqId.id
      } else {
        const numericId = Number(pidStr)
        if (!Number.isNaN(numericId)) {
          const byId = await User.query()
            .where('type', UserTypeEnum.practitioner)
            .where('id', numericId)
            .first()
          if (byId) practitionerId = byId.id
        }
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

    // Only include fields that exist in FIELD_MAPPING (First Name, Last Name, Session Duration, etc.); ignore all other keys
    const sessionObject: Record<string, string> = {}
    for (const q of payload.Questions) {
      const id = q.id ?? (q as any).Id
      const answer = q.answer ?? (q as any).Answer ?? ''
      const fieldName = FIELD_MAPPING[id]
      if (fieldName) sessionObject[fieldName] = answer ?? ''
    }
    const sessionString = JSON.stringify(sessionObject)
    const sessionTime = getSessionTimeFromPayload(payload)

    // Store webhook session version if JSON is different from previous
    const versionResult = await storeWebhookSessionVersionIfDifferent(payload.NoteId, sessionObject)

    // session_id must be unique per note so new note always gets its own row
    const sessionId = `session-${payload.NoteId}`

    // Only treat as existing if this exact note_id already has a session (do not match by session_id prefix)
    const existingSession = await Session.query().where('note_id', payload.NoteId).first()

    let session: Session

    if (existingSession) {
      // Update existing session (parent-child: do not change parentNoteId)
      existingSession.session = sessionString
      existingSession.sessionTime = sessionTime.isValid ? sessionTime : DateTime.now()
      existingSession.practitionerId = practitionerId
      existingSession.patientId = patientId
      await existingSession.save()
      session = existingSession
    } else {
      // Create new session with parent_note_id = null (this note is latest for chain)
      session = await Session.create({
        noteId: payload.NoteId,
        sessionId,
        session: sessionString,
        sessionTime: sessionTime.isValid ? sessionTime : DateTime.now(),
        practitionerId,
        patientId,
        type: SessionTypeEnum.intake,
        cptCodeId: cptCode.id,
        aiScore: null,
        aiStatus: AiStatusEnum.not_reviewed,
        humanReview: HumanReviewEnum.pending,
        manager: ManagerEnum.pending,
        workflow: WorkflowEnum.in_queue,
        priority: PriorityEnum.low,
        reviewCycle: ReviewCycleEnum.cycle_1_of_3,
        parentNoteId: null,
      })

      // Parent-child: link previous "latest" note for this patient to this new note
      if (patientId !== null) {
        const previousLatest = await Session.query()
          .where('patient_id', patientId)
          .whereNull('parent_note_id')
          .whereNot('id', session.id)
          .first()
        if (previousLatest) {
          previousLatest.parentNoteId = session.id
          await previousLatest.save()
        }
      }

      // Ensure at least one webhook version exists for this note (same as MORF sync)
      const hasVersion = await WebhookSessionVersion.query()
        .where('note_id', session.noteId)
        .first()
      if (!hasVersion) {
        await WebhookSessionVersion.create({
          noteId: session.noteId,
          sessionJson: session.session || '{}',
        })
      }
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

    const status = existingSession ? 'updated' : 'created'
    console.log('[Webhook] Processing ended', { noteId, status: 'processed', action: status })
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
  } catch (error: any) {
    console.log('[Webhook] Processing ended', {
      noteId,
      status: 'not processed',
      error: error.message,
    })
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
  const payload = jobData.payload

  if (!payload.NoteId || typeof payload.NoteId !== 'string' || payload.NoteId.trim().length === 0) {
    errors.push('NoteId is required and must be a non-empty string')
  }

  // Type is not in webhookSessionValidatorInterface, so we check it safely
  const typeValue = (payload as any).Type
  if (typeValue !== undefined && typeValue !== null) {
    if (typeof typeValue !== 'string' || typeValue.trim().length === 0) {
      errors.push('Type must be a non-empty string if provided')
    }
  }

  if (payload.ClientId !== undefined && payload.ClientId !== null) {
    if (typeof payload.ClientId !== 'number' || !Number.isInteger(payload.ClientId)) {
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
  const payload = jobData.payload
  const noteId = payload.NoteId
  const type = (payload as any).Type
  const clientId = payload.ClientId

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

  // Only include fields that exist in FIELD_MAPPING; ignore all other keys
  let sessionString = ''
  if (noteDetails && 'Questions' in noteDetails && Array.isArray((noteDetails as any).Questions)) {
    const sessionObject: Record<string, string> = {}
    const questions = (noteDetails as any).Questions
    for (const q of questions) {
      const id = q.Id ?? q.id
      const answer = q.Answer ?? q.answer ?? ''
      const fieldName = FIELD_MAPPING[id]
      if (fieldName) sessionObject[fieldName] = answer ?? ''
    }
    sessionString = JSON.stringify(sessionObject)
  }

  let patientId: number | null = null
  if (clientId) {
    const clientIdString = String(clientId)
    const patient = await Patient.query().where('client_id', clientIdString).first()
    if (patient) {
      patientId = patient.id
    } else {
      const newPatient = await Patient.create({ clientId: clientIdString })
      patientId = newPatient.id
    }
  }

  const cptCode = await CptCode.findBy('code', '90791')
  const sessionId = `session-${noteId || ''}`
  const sessionTime = (() => {
    const d = (noteDetails as any)?.Date ?? (noteDetails as any)?.LastModified
    if (d && typeof d === 'string') {
      const parsed = DateTime.fromISO(d, { setZone: true })
      if (parsed.isValid) return parsed
    }
    return DateTime.now()
  })()

  let practitionerId = 1
  const pl = payload as any
  if (pl.PractitionerEmail) {
    const u = await User.query().where('email', pl.PractitionerEmail).first()
    if (u) practitionerId = u.id
  } else if (pl.PractitionerId) {
    const pidStr = String(pl.PractitionerId).trim()
    const byPqId = await User.query().where('pq_id', pidStr).first()
    if (byPqId) practitionerId = byPqId.id
    else {
      const numericId = Number(pidStr)
      if (!Number.isNaN(numericId)) {
        const byId = await User.query().where('id', numericId).first()
        if (byId) practitionerId = byId.id
      }
    }
  }

  const existing = await Session.query()
    .where('note_id', noteId || '')
    .preload('practitioner')
    .first()

  let session: Session | null = null

  if (existing) {
    session = existing
    existing.session = sessionString || existing.session
    existing.sessionTime = sessionTime.isValid ? sessionTime : DateTime.now()
    existing.practitionerId = practitionerId
    existing.patientId = patientId
    existing.workflow = workflowStatus
    await existing.save()
    await session.load('practitioner')
  } else if (noteId) {
    session = await Session.create({
      noteId,
      sessionId,
      session: sessionString || '{}',
      sessionTime: sessionTime.isValid ? sessionTime : DateTime.now(),
      practitionerId,
      patientId,
      type: SessionTypeEnum.intake,
      cptCodeId: cptCode?.id ?? null,
      aiScore: null,
      aiStatus: AiStatusEnum.not_reviewed,
      humanReview: HumanReviewEnum.pending,
      manager: ManagerEnum.pending,
      workflow: workflowStatus,
      priority: PriorityEnum.low,
      reviewCycle: ReviewCycleEnum.cycle_1_of_3,
      parentNoteId: null,
    })
    await session.load('practitioner')

    if (patientId !== null) {
      const previousLatest = await Session.query()
        .where('patient_id', patientId)
        .whereNull('parent_note_id')
        .whereNot('id', session.id)
        .first()
      if (previousLatest) {
        previousLatest.parentNoteId = session.id
        await previousLatest.save()
      }
    }

    const hasVersion = await WebhookSessionVersion.query().where('note_id', session.noteId).first()
    if (!hasVersion) {
      await WebhookSessionVersion.create({
        noteId: session.noteId,
        sessionJson: session.session || '{}',
      })
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
    sessionStored: session ? true : null,
    patientId,
  }
}
