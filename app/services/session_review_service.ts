import { invokeBedrockModel } from '#services/bedrock_service'
import { sendSuccess } from '#services/custom_response_service'
import { EvaluationPromptKeys } from '#enums/evaluation_prompt_enum'
import { invokeSessionReviewValidatorInterface } from '#validators/session_review_validator'

const buildUserPrompt = (currentNote: string, previousNote?: string | null) => {
  const previousText = previousNote?.trim()
    ? previousNote
    : 'No previous sessions available for this patient'

  return `${EvaluationPromptKeys.currentSession}:
${currentNote}

${EvaluationPromptKeys.previousSessions}:
${previousText}`
}

export const invokeSessionReview = async (payload: invokeSessionReviewValidatorInterface) => {
  try {
    const userPrompt = buildUserPrompt(payload.current_note, payload.previous_note)

    const response = await invokeBedrockModel(
      payload.model_id,
      payload.prompt,
      userPrompt,
      payload.temperature ?? 0.7,
      payload.top_p ?? undefined,
      payload.top_k ?? undefined
    )

    return sendSuccess('Session review response', response)
  } catch (error: any) {
    console.log('Error in invokeSessionReview:', error?.message || error)
    throw error
  }
}
