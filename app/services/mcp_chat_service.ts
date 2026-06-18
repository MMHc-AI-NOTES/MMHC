import Chat, { chatFilterEnum, chatSortEnum } from '#models/chat'
import Session from '#models/session'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess } from '#services/custom_response_service'
import {
  evaluateChatWithMcp,
  resolveMcpClientId,
  toMcpApiResponse,
  type NormalizedEvaluationResult,
  type McpScoreNoteResponse,
} from '#services/mcp_service'
import { resolvePreviousSessionContent } from '#services/session_note_resolver'
import { getChatAiReview } from '#services/evaluation_service'
import { AiStatusEnum, WorkflowEnum } from '#enums/session_enum'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'
import { ChatSeverityEnum, ChatTriggerSourceEnum, ChatResultEnum } from '#enums/chat_enum'
import { aiScoreThresholds } from '#helpers/gemini_safety_config'
import { DateTime } from 'luxon'
import { createAuditLog } from '#services/audit_log_service'
import type { HttpContext } from '@adonisjs/core/http'
import { AuditActionEnum } from '#enums/audit_log_enum'
import type { createMcpChatValidatorInterface } from '#validators/mcp_chat_validator'
import logger from '@adonisjs/core/services/logger'

export const MCP_MODEL_ID = 'mcp-v13'
export const MCP_PROMPT_LABEL = 'MCP AI Scorer v13'

function mapSeverity(validationStatus?: string): number {
  if (validationStatus === 'error') return ChatSeverityEnum.critical
  if (validationStatus === 'fail') return ChatSeverityEnum.moderate
  return ChatSeverityEnum.minor
}

function mapResult(validationStatus?: string): number | null {
  if (validationStatus === 'pass') return ChatResultEnum.pass
  if (validationStatus === 'fail') return ChatResultEnum.fail
  if (validationStatus === 'error') return ChatResultEnum.error
  return null
}

function mapAiStatus(aiScore: number): number {
  if (aiScore >= aiScoreThresholds.passed) return AiStatusEnum.passed
  if (aiScore < aiScoreThresholds.failed) return AiStatusEnum.failed
  return AiStatusEnum.warning
}

function mapWorkflow(validationStatus?: string): number {
  if (validationStatus === 'pass') return WorkflowEnum.completed
  return WorkflowEnum.in_queue
}

async function runMcpEvaluation(session: Session): Promise<NormalizedEvaluationResult> {
  await session.load('patient')

  const previousNote = await resolvePreviousSessionContent(session)

  return evaluateChatWithMcp({
    noteId: session.noteId,
    clientId: resolveMcpClientId(session),
    currentNote: session.session,
    previousNote,
  })
}

export const createMcpChat = async (
  reqData: createMcpChatValidatorInterface,
  userId: number,
  ctx?: HttpContext
) => {
  const session = await Session.query().where('note_id', reqData.note_id).preload('patient').first()

  if (!session) {
    ctx?.logger.error({ noteId: reqData.note_id }, 'Session not found while creating MCP chat')
    throw new Error('Session not found for the provided note')
  }

  const startTimeMs = Date.now()
  const startTime = DateTime.fromMillis(startTimeMs)

  const evaluation = await runMcpEvaluation(session)

  const endTimeMs = Date.now()
  const endTime = DateTime.fromMillis(endTimeMs)
  const responseTime = (endTimeMs - startTimeMs) / 1000

  const severity = mapSeverity(evaluation.validation_result?.status)
  const result = mapResult(evaluation.validation_result?.status)

  const chat = await Chat.create({
    prompt: MCP_PROMPT_LABEL,
    userNote: session.session,
    userInput: evaluation.user_input,
    modelId: MCP_MODEL_ID,
    noteId: reqData.note_id,
    evaluationScore: evaluation.score,
    responseTime,
    startTime,
    endTime,
    sentiment: evaluation.sentiment,
    evaluation: evaluation.evaluation,
    bedrockResponse: evaluation,
    userId,
    agentId: null,
    triggerSource: ChatTriggerSourceEnum.rerun,
    severity,
    result,
    aiReview: getChatAiReview(),
  })

  await createAuditLog({
    ctx,
    userId,
    description: `MCP chat created for note ${reqData.note_id}`,
    action: AuditActionEnum.chatCreated,
    modelType: 'Chat',
    modelId: chat.id,
    noteId: reqData.note_id,
    status: true,
    metadata: {
      note_id: reqData.note_id,
      chat_id: chat.id,
      provider: 'MCP',
      model_id: MCP_MODEL_ID,
    },
  })

  const aiScore = evaluation.score
  const aiStatus = mapAiStatus(aiScore)
  const workflow = mapWorkflow(evaluation.validation_result?.status)

  await session
    .merge({
      aiScore,
      aiStatus,
      workflow,
      reviewCycle: ReviewCycleEnum.cycle_1_of_3,
    })
    .save()

  return sendSuccess('MCP chat created and scored successfully', toMcpApiResponse(evaluation))
}

export const scoreMcpNote = async (reqData: createMcpChatValidatorInterface) => {
  const session = await Session.query().where('note_id', reqData.note_id).preload('patient').first()

  if (!session) {
    logger.error({ noteId: reqData.note_id }, 'Session not found for the provided note')
    throw new Error('Session not found for the provided note')
  }

  const evaluation = await runMcpEvaluation(session)

  return sendSuccess('MCP note scored successfully', toMcpApiResponse(evaluation))
}

export const getMcpChatById = async (chatId: number) => {
  const chat = await Chat.query()
    .where('id', chatId)
    .where('model_id', MCP_MODEL_ID)
    .preload('user')
    .preload('humanReviews', (reviewsQuery) =>
      reviewsQuery.orderBy('id', 'desc').preload('practitioner')
    )
    .first()

  if (!chat) {
    logger.error({ chatId }, 'MCP chat not found')
    throw new Error('MCP chat not found')
  }

  const stored = chat.bedrockResponse as NormalizedEvaluationResult | null
  if (!stored) {
    throw new Error('MCP response not found for this chat')
  }

  return sendSuccess('MCP chat retrieved successfully', toMcpApiResponse(stored))
}

export const reevaluateMcpChat = async (chatId: number) => {
  const chat = await Chat.find(chatId)

  if (!chat || chat.modelId !== MCP_MODEL_ID) {
    logger.error({ chatId }, 'MCP chat not found')
    throw new Error('MCP chat not found')
  }

  const session = await Session.query().where('note_id', chat.noteId).preload('patient').first()

  if (!session) {
    logger.error({ noteId: chat.noteId }, 'Session not found for this chat')
    throw new Error('Session not found for this chat')
  }

  const startTimeMs = Date.now()
  const startTime = DateTime.fromMillis(startTimeMs)

  const evaluation = await runMcpEvaluation(session)

  const endTimeMs = Date.now()
  const endTime = DateTime.fromMillis(endTimeMs)
  const responseTime = (endTimeMs - startTimeMs) / 1000

  chat.evaluationScore = evaluation.score
  chat.responseTime = responseTime
  chat.startTime = startTime
  chat.endTime = endTime
  chat.sentiment = evaluation.sentiment
  chat.evaluation = evaluation.evaluation
  chat.bedrockResponse = evaluation
  chat.userInput = evaluation.user_input
  chat.severity = mapSeverity(evaluation.validation_result?.status)
  chat.result = mapResult(evaluation.validation_result?.status)
  chat.userNote = session.session

  await chat.save()

  const aiScore = evaluation.score
  const aiStatus = mapAiStatus(aiScore)
  const workflow = mapWorkflow(evaluation.validation_result?.status)

  await session
    .merge({
      aiScore,
      aiStatus,
      workflow,
      reviewCycle: ReviewCycleEnum.cycle_1_of_3,
    })
    .save()

  return sendSuccess('MCP chat re-evaluated successfully', toMcpApiResponse(evaluation))
}

export const listMcpChats = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  let query: any
  let filterData: any
  let sortChat: any

  let chatListings: any = Chat.query()
    .where('model_id', MCP_MODEL_ID)
    .preload('user')
    .preload('humanReviews', (reviewsQuery) =>
      reviewsQuery.orderBy('id', 'desc').preload('practitioner')
    )

  if (filters?.length) {
    filterData = applyFilters(chatListings, filters, chatFilterEnum)
  }
  if (filterData?.status === false) {
    return {
      status: filterData.status,
      message: filterData.message,
    }
  }

  query = filterData?.query ?? chatListings
  if (!sorts?.length) {
    query = query.orderBy('id', 'desc')
  }
  if (sorts?.length) {
    sortChat = applySorting(query, sorts, chatSortEnum)
    if (sortChat?.status) {
      return sortChat
    }
  }

  const sortQuery = sortChat?.query ?? query
  const chatListingPaginated = await paginateQuery(sortQuery, pageSize, page)

  return {
    status: true,
    message: 'MCP chats listed successfully',
    data: {
      count: chatListingPaginated['rows'].length,
      total_count: chatListingPaginated.total,
      total_page_count: chatListingPaginated.lastPage,
      page: chatListingPaginated.currentPage,
      page_size: chatListingPaginated.perPage,
      data: chatListingPaginated['rows']
        .map((row: any) => {
          const stored = row.bedrockResponse as NormalizedEvaluationResult | null
          return stored ? toMcpApiResponse(stored) : null
        })
        .filter(Boolean) as McpScoreNoteResponse[],
    },
  }
}
