import Session from '#models/session'
import CptCode from '#models/cpt_code'
import User from '#models/user'
import Patient from '#models/patient'
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
import { fetchAppointmentTypeIdFromBigQuery } from '#services/bigquery_service'
import { DateTime } from 'luxon'
import type { WebhookJobData } from '#jobs/queues/webhook_queue'

/**
 * Enqueue CPT enrichment for a session after it is saved.
 * Failures are logged and do not fail the webhook save path.
 */
const enqueueSessionCptJob = async (sessionId: number) => {
  try {
    const { addSessionCptJob } = await import('#jobs/queues/session_cpt_queue')
    await addSessionCptJob({ sessionId })
    console.log('[Session CPT] Queued job', { sessionId })
  } catch (error: any) {
    console.error('[Session CPT] Failed to queue job', {
      sessionId,
      error: error.message,
    })
  }
}

/**
 * Resolve AppointmentTypeId from BigQuery via session.note_id,
 * look up cpt_codes by appointment_type_id, and update session.cpt_code_id.
 */
export const updateSessionCptCodeBySessionId = async (sessionId: number) => {
  const session = await getSessionById(sessionId)

  const appointmentTypeId = await fetchAppointmentTypeIdFromBigQuery(session.noteId)

  if (!appointmentTypeId) {
    console.log('[Session CPT] No AppointmentTypeId from BigQuery', {
      sessionId,
      noteId: session.noteId,
    })
    return {
      updated: false,
      sessionId,
      noteId: session.noteId,
      appointmentTypeId: null,
      cptCodeId: null,
      reason: 'no_appointment_type_id',
    }
  }
  console.log('appointmentTypeId in session tabek', appointmentTypeId)
  const cptCode = await CptCode.query().where('appointment_type_id', appointmentTypeId).first()

  if (!cptCode) {
    console.log('[Session CPT] No cpt_codes row for appointment_type_id', {
      sessionId,
      noteId: session.noteId,
      appointmentTypeId,
    })
    return {
      updated: false,
      sessionId,
      noteId: session.noteId,
      appointmentTypeId,
      cptCodeId: null,
      reason: 'no_cpt_code_match',
    }
  }
  console.log('cptCode', cptCode)
  session.cptCodeId = cptCode.id
  await session.save()

  console.log('[Session CPT] Updated session cpt_code_id', {
    sessionId,
    noteId: session.noteId,
    appointmentTypeId,
    cptCodeId: cptCode.id,
  })

  return {
    updated: true,
    sessionId,
    noteId: session.noteId,
    appointmentTypeId,
    cptCodeId: cptCode.id,
  }
}

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
 * Re-link all sessions for a patient into a parent-child chain based on sessionTime.
 * Oldest note points to next newer via parent_note_id, and the newest note has parent_note_id = null.
 */
export async function relinkPatientSessions(patientId: number) {
  const sessions = await Session.query()
    .where('patient_id', patientId)
    .orderBy('session_time', 'asc')
    .orderBy('id', 'asc')

  if (!sessions.length) {
    return
  }

  for (let i = 0; i < sessions.length; i++) {
    const current = sessions[i]
    const next = i + 1 < sessions.length ? sessions[i + 1] : null
    const newParentId = next ? next.id : null

    if (current.parentNoteId !== newParentId) {
      current.parentNoteId = newParentId
      await current.save()
    }
  }
}

export const getSessionById = async (id: number) => {
  try {
    const session = await Session.query().where('id', id).whereNull('deleted_at').first()

    if (!session) {
      throw new Error(`Session with id ${id} does not exist`)
    }

    return session
  } catch (error: any) {
    console.log('Error in getSessionById:', error.message)
    throw new Error(error.message)
  }
}

export const getSessionBySessionId = async (sessionId: string) => {
  try {
    const session = await Session.query()
      .where('session_id', sessionId)
      .whereNull('deleted_at')
      .first()

    if (!session) {
      throw new Error(`Session with session_id ${sessionId} does not exist`)
    }

    return session
  } catch (error: any) {
    console.log('Error in getSessionBySessionId:', error.message)
    throw new Error(error.message)
  }
}

export const getSessionByNoteId = async (noteId: string) => {
  try {
    const session = await Session.query().where('note_id', noteId).first()

    if (!session) {
      throw new Error(`Session with note_id ${noteId} does not exist`)
    }

    return session
  } catch (error: any) {
    console.log('Error in getSessionByNoteId:', error.message)
    throw new Error(error.message)
  }
}

/**
 * Webhook flow (parent-child method):
 * 1. Use ClientId to resolve patient (find or create).
 * 2. Compute sessionTime from payload.Date / EventTime.
 * 3. If this NoteId already exists in DB: update session (session, sessionTime, practitioner/patient).
 * 4. If this NoteId does not exist: create new note (session).
 * 5. After save, for this patient, sort ALL sessions by sessionTime ascending and
 *    rebuild the parent-child chain:
 *      - For each note, parent_note_id = next newer note's id
 *      - Latest note has parent_note_id = null
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
      // Update existing session; parent-child chain will be recomputed below
      existingSession.session = sessionString
      existingSession.sessionTime = sessionTime.isValid ? sessionTime : DateTime.now()
      existingSession.practitionerId = practitionerId
      existingSession.patientId = patientId
      await existingSession.save()
      session = existingSession
    } else {
      // Create new session
      session = await Session.create({
        noteId: payload.NoteId,
        sessionId,
        session: sessionString,
        sessionTime: sessionTime.isValid ? sessionTime : DateTime.now(),
        practitionerId,
        patientId,
        type: SessionTypeEnum.progress_note,
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

    // Rebuild parent-child chain for this patient's sessions based on sessionTime
    if (session.patientId !== null) {
      await relinkPatientSessions(session.patientId)
    }

    await enqueueSessionCptJob(session.id)

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

const validatePayloadQuestions = (
  questions: webhookSessionValidatorInterface['Questions']
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!questions || !Array.isArray(questions)) {
    errors.push('Questions array not found in webhook payload')
    return { isValid: false, errors }
  }

  const questionsWithAnswers = questions.filter(
    (q) => q.text && q.answer && typeof q.answer === 'string' && q.answer.trim().length > 0
  )

  const foundRequiredQuestions: string[] = []
  const missingRequiredQuestions: string[] = []

  REQUIRED_QUESTIONS.forEach((requiredText) => {
    const found = questionsWithAnswers.some((q) => q.text && q.text.trim() === requiredText.trim())
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

  let questionsValidation: { isValid: boolean; errors: string[] } | null = null
  if (webhookValidation.isValid && noteId) {
    questionsValidation = validatePayloadQuestions(payload.Questions ?? [])
    if (!questionsValidation.isValid) {
      workflowStatus = WorkflowEnum.failed
    }
  }

  // Only include fields that exist in FIELD_MAPPING; ignore all other keys
  const sessionObject: Record<string, string> = {}
  if (Array.isArray(payload.Questions)) {
    for (const q of payload.Questions) {
      const id = q.id ?? (q as any).Id
      const answer = q.answer ?? (q as any).Answer ?? ''
      const fieldName = FIELD_MAPPING[id]
      if (fieldName) sessionObject[fieldName] = answer ?? ''
    }
  }
  const sessionString = JSON.stringify(sessionObject)

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
    const d = payload.Date ?? payload.LastModified
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
      type: SessionTypeEnum.progress_note,
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

  if (session) {
    await enqueueSessionCptJob(session.id)
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
    noteDetails: null,
    sessionStored: session ? true : null,
    patientId,
  }
}
