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
import logger from '@adonisjs/core/services/logger'
import { resolveSessionType, buildSessionObject } from '#services/note_type_mapping_service'
/**
 * Enqueue CPT enrichment for a session after it is saved.
 * Failures are logged and do not fail the webhook save path.
 */
const enqueueSessionCptJob = async (sessionId: number) => {
  try {
    const { addSessionCptJob } = await import('#jobs/queues/session_cpt_queue')
    await addSessionCptJob({ sessionId })
    logger.info('[Session CPT] Queued job', { sessionId })
  } catch (error: any) {
    logger.error('[Session CPT] Failed to queue job', {
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
    logger.info('[Session CPT] No AppointmentTypeId from BigQuery', {
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
  logger.info('appointmentTypeId in session table', appointmentTypeId)
  const cptCode = await CptCode.query().where('appointment_type_id', appointmentTypeId).first()

  if (!cptCode) {
    logger.info('[Session CPT] No cpt_codes row for appointment_type_id', {
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
  session.cptCodeId = cptCode.id
  await session.save()

  logger.info('[Session CPT] Updated session cpt_code_id', {
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
    logger.error('Error in getSessionById:', error.message)
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
    logger.error('Error in getSessionBySessionId:', error.message)
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
    logger.error('Error in getSessionByNoteId:', error.message)
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
export const createSessionFromWebhook = async (payload: any) => {
  const noteId = payload.NoteId ?? payload.note_id ?? payload.noteId
  logger.info('[Webhook] Processing started', { noteId })

  try {
    // Get CPT code 90791 (default for sessions)
    const cptCode = await CptCode.findBy('code', '90791')
    if (!cptCode) {
      throw new Error('CPT code 90791 not found. Please ensure CPT code seeder has been run.')
    }

    // Find or create practitioner by PractitionerEmail or PractitionerId
    let practitionerId: number | null = null

    const email = payload.PractitionerEmail ?? payload.practitioner_email ?? payload.Email
    if (email && String(email).trim() !== '') {
      const emailStr = String(email).trim()
      const practitionerByEmail = await User.query()
        .where('email', emailStr)
        .first()

      if (practitionerByEmail) {
        practitionerId = practitionerByEmail.id
      } else {
        // Create new practitioner only if no user exists with this email
        const newPractitioner = await User.create({
          email: emailStr,
          fullName: payload.PractitionerName || null,
          type: UserTypeEnum.practitioner,
          isActive: true,
          password: null,
        })
        practitionerId = newPractitioner.id
      }
    }

    const pid = payload.PractitionerId ?? payload.practitioner_id ?? payload.practitionerId ?? null
    if (!practitionerId && pid !== null && pid !== undefined && String(pid).trim() !== '') {
      const pidStr = String(pid).trim()
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
      const systemUser = await User.find(1)
      if (systemUser) {
        practitionerId = systemUser.id
      } else {
        throw new Error(
          `Practitioner not found. Please provide PractitionerEmail or valid PractitionerId.`
        )
      }
    }

    // Find or create patient by PatientId or ClientId
    let patientId: number | null = null
    const patientIdRaw = payload.PatientId ?? payload.patient_id ?? payload.patientId ?? null
    const clientId = payload.ClientId ?? payload.client_id ?? payload.clientId ?? payload.ClientID ?? null

    if (patientIdRaw !== null && patientIdRaw !== undefined && String(patientIdRaw).trim() !== '') {
      const p = await Patient.query().where('id', Number(patientIdRaw)).first()
      if (p) patientId = p.id
    }

    if (patientId === null && clientId !== null && clientId !== undefined && String(clientId).trim() !== '') {
      const clientIdString = String(clientId).trim()
      let patient = await Patient.query().where('client_id', clientIdString).first()

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

    // NoteName is where PracticeQ/MORF sends the note type; Type is a fallback.
    const typeValue = payload.NoteName ?? payload.noteName ?? payload.Type ?? payload.type
    const resolvedType = resolveSessionType(typeValue, noteId)
    const sessionType = resolvedType.type
    const questions = payload.Questions ?? payload.questions ?? []
    const sessionObject = buildSessionObject(
      questions,
      resolvedType.matched ? sessionType : undefined
    )
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
      existingSession.type = sessionType
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
        type: sessionType,
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
    logger.info('[Webhook] Processing ended', {
      noteId,
      status: 'processed',
      action: status,
    })
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
    logger.error('[Webhook] Processing ended', {
      noteId,
      status: 'not processed',
      error: error.message,
    })
    logger.error('Error in createSessionFromWebhook:', error.message)
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

// These are progress-note-specific question labels, so the strict check
// below only runs when the note is actually a progress note. Intake/
// treatment-plan/termination notes use different text entirely (e.g.
// "First Name:" not "Client First Name:") and were getting marked as
// workflow=failed by this same check before it knew about note types.
const REQUIRED_QUESTIONS = [
  'Client First Name:',
  'Client Last Name:',
  'Client DOB:',
  'Client Mobile Phone:',
  '5th question',
]

const validatePayloadQuestions = (
  questions: webhookSessionValidatorInterface['Questions'],
  sessionType?: number
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!questions || !Array.isArray(questions)) {
    errors.push('Questions array not found in webhook payload')
    return { isValid: false, errors }
  }

  const questionsWithAnswers = questions.filter(
    (q) => q.text && q.answer && typeof q.answer === 'string' && q.answer.trim().length > 0
  )

  // other note types don't use these labels, just check something got answered
  if (sessionType !== undefined && sessionType !== SessionTypeEnum.progress_note) {
    if (questionsWithAnswers.length === 0) {
      errors.push('No answered questions found in webhook payload')
    }
    return { isValid: errors.length === 0, errors }
  }

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

  // resolved before validation below since what counts as valid depends on the type
  const resolvedType = resolveSessionType((payload as any).NoteName ?? type, noteId)
  const sessionType = resolvedType.type

  const webhookValidation = validateWebhookKeys(jobData)
  let workflowStatus = WorkflowEnum.in_queue

  if (!webhookValidation.isValid) {
    workflowStatus = WorkflowEnum.failed
  }

  let questionsValidation: { isValid: boolean; errors: string[] } | null = null
  if (webhookValidation.isValid && noteId) {
    questionsValidation = validatePayloadQuestions(payload.Questions ?? [], sessionType)
    if (!questionsValidation.isValid) {
      workflowStatus = WorkflowEnum.failed
    }
  }

  // same deal - skip the id map if we're not confident about the type
  const sessionObject = buildSessionObject(
    payload.Questions,
    resolvedType.matched ? sessionType : undefined
  )
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
    existing.type = sessionType
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
      type: sessionType,
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
  }

  if (session) {
    await storeWebhookSessionVersionIfDifferent(session.noteId, sessionObject)
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
