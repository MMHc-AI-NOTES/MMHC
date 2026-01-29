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
