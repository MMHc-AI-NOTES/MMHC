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
import { sendSuccess, sendError } from '#services/custom_response_service'
import type { webhookSessionValidatorInterface } from '#validators/webhook_validator'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'

export const createSessionFromWebhook = async (payload: webhookSessionValidatorInterface) => {
  try {
    // Get CPT code 90791 (default for sessions)
    const cptCode = await CptCode.findBy('code', '90791')
    if (!cptCode) {
      throw new Error('CPT code 90791 not found. Please ensure CPT code seeder has been run.')
    }

    // Find practitioner by PractitionerName
    let practitionerId: number | null = null
    if (payload.PractitionerId) {
      const practitioner = await User.query()
        .where('type', UserTypeEnum.practitioner)
        .andWhere('id', payload.PractitionerId)
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

    // Generate sessionId from NoteId (use NoteId as sessionId or create pattern)
    const sessionId = `session-${payload.NoteId.substring(0, 8)}`

    // Check if session already exists
    const existingSession = await Session.query()
      .where('note_id', payload.NoteId)
      .orWhere('session_id', sessionId)
      .first()

    if (existingSession) {
      return sendError('Session with this noteId or sessionId already exists', null)
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

    return sendSuccess('Session created successfully from webhook', session)
  } catch (error: any) {
    console.log('Error in createSessionFromWebhook:', error.message)
    throw error
  }
}
