import HumanReview from '#models/human_review'
import Session from '#models/session'
import { sendSuccess, sendError } from '#services/custom_response_service'
import type { createHumanReviewValidatorInterface } from '#validators/human_review_validator'

export const createHumanReview = async (reqData: createHumanReviewValidatorInterface) => {
  try {
    // Verify note exists
    const note = await Session.query().where('note_id', reqData.note_id).first()

    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    // Create human review
    const humanReviewData = {
      noteId: reqData.note_id,
      practitionerId: reqData.practitioner_id,
      decision: reqData.decision,
      chatId: reqData.chat_id ?? null,
      manualScore: reqData.manual_score ?? null,
      comment: reqData.comment ?? null,
    }

    const humanReview = await HumanReview.create(humanReviewData)

    // Reload with relationships
    await humanReview.load('practitioner')
    await humanReview.load('note')
    if (humanReview.chatId) {
      await humanReview.load('chat')
    }

    return sendSuccess('Human review created successfully', humanReview)
  } catch (error: any) {
    return sendError(error.message)
  }
}
