import { evaluateChatWithBedrock } from '#services/bedrock_service'
import { sendSuccess } from '#services/custom_response_service'
import { ChatResultEnum, ChatSeverityEnum, ChatTriggerSourceEnum } from '#enums/chat_enum'
import { invokeSessionReviewValidatorInterface } from '#validators/session_review_validator'
import { DateTime } from 'luxon'
import Session from '#models/session'
import Agent from '#models/agent'

export const invokeSessionReview = async (payload: invokeSessionReviewValidatorInterface) => {
  try {
    const session = await Session.query().where('note_id', payload.note_id).first()
    if (!session) {
      throw new Error('Session not found for the provided note')
    }

    const agent = await Agent.find(payload.prompt_id)
    if (!agent) {
      throw new Error('Agent not found for the provided prompt')
    }

    if (!agent.prompt) {
      throw new Error('Agent prompt is not configured')
    }

    const previousSession = await Session.query().where('parent_note_id', session.id).first()
    const previousNote = previousSession?.session || undefined

    const currentNote = session.session
    const prompt = agent.prompt
    const modelId = payload.model_id || agent.model
    const temperature = payload.temperature ?? agent.temperature ?? 0.3
    const topP = payload.top_p ?? agent.topP ?? 0.9
    const topK = payload.top_k ?? agent.topK ?? 250

    const startTimeMs = Date.now()
    const startTime = DateTime.fromMillis(startTimeMs)

    // Playground mode: run same chat evaluation logic, but do not write DB records.
    const evaluation = await evaluateChatWithBedrock(
      modelId,
      currentNote,
      previousNote,
      prompt,
      temperature,
      topP,
      topK
    )

    const endTimeMs = Date.now()
    const endTime = DateTime.fromMillis(endTimeMs)
    const responseTime = (endTimeMs - startTimeMs) / 1000

    let severity = ChatSeverityEnum.minor
    if (evaluation.validation_result) {
      if (evaluation.validation_result.status === 'error') {
        severity = ChatSeverityEnum.critical
      } else if (evaluation.validation_result.status === 'fail') {
        severity = ChatSeverityEnum.moderate
      }
    }

    let result: number | null = null
    if (evaluation.validation_result) {
      if (evaluation.validation_result.status === 'pass') {
        result = ChatResultEnum.pass
      } else if (evaluation.validation_result.status === 'fail') {
        result = ChatResultEnum.fail
      } else if (evaluation.validation_result.status === 'error') {
        result = ChatResultEnum.error
      }
    }

    const previewData = {
      prompt,
      userNote: currentNote,
      userInput: evaluation.user_input,
      /** Unmodified model text output (same as bedrockResponse.raw_response). */
      raw_model_output: evaluation.raw_response,
      modelId,
      noteId: payload.note_id,
      agentId: payload.prompt_id,
      evaluationScore: evaluation.score,
      responseTime,
      startTime,
      endTime,
      sentiment: evaluation.sentiment,
      evaluation: evaluation.evaluation,
      bedrockResponse: evaluation,
      triggerSource: ChatTriggerSourceEnum.rerun,
      severity,
      result,
      isPlayground: true,
    }

    return sendSuccess('Session review response (playground, not saved)', previewData)
  } catch (error: any) {
    throw error
  }
}
