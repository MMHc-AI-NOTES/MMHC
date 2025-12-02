import Chat, { chatFilterEnum, chatSortEnum } from '#models/chat'
import Session from '#models/session'
import Agent from '#models/agent'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { evaluateChatWithBedrock } from '#services/bedrock_service'
import { AiStatusEnum } from '#enums/session_enum'
import { aiScoreThresholds, aiDefaultConfig } from '#helpers/gemini_safety_config'
import { DateTime } from 'luxon'
import type {
  createChatValidatorInterface,
  updateChatValidatorInterface,
} from '#validators/chat_validator'

export const createChat = async (reqData: createChatValidatorInterface, userId: number) => {
  try {
    // Get session from note_id
    const session = await Session.query().where('note_id', reqData.note_id).first()

    if (!session) {
      return sendError('Session not found for the provided note_id')
    }

    // Get agent (prompt) from prompt_id (agent_id)
    const agent = await Agent.find(reqData.prompt_id)

    if (!agent) {
      return sendError('Agent not found for the provided prompt_id')
    }

    if (!agent.prompt) {
      return sendError('Agent prompt is not configured')
    }

    if (!agent.model) {
      return sendError('Agent model is not configured')
    }

    // Get previous session for comparison (same practitioner, before current session)
    const previousSession = await Session.query()
      .where('practitioner_id', session.practitionerId)
      .where('created_at', '<', session.createdAt.toSQL()!)
      .orderBy('created_at', 'desc')
      .first()

    // Use session.session as current note and agent.prompt as prompt
    const currentNote = session.session
    const previousNote = previousSession?.session || undefined
    const prompt = agent.prompt
    const modelId = agent.model
    const temperature = agent.temperature ?? 0.3
    const topP = agent.topP ?? 0.9
    const topK = agent.topK ?? 250

    if (!prompt) {
      return sendError('Agent prompt is required for evaluation')
    }

    // Record start time before Bedrock evaluation
    const startTimeMs = Date.now()
    const startTime = DateTime.fromMillis(startTimeMs)

    // Evaluate with Bedrock (with previous note for comparison)
    const evaluation = await evaluateChatWithBedrock(
      modelId,
      currentNote,
      previousNote,
      prompt,
      temperature,
      topP,
      topK
    )

    // Record end time and calculate response time in seconds
    const endTimeMs = Date.now()
    const endTime = DateTime.fromMillis(endTimeMs)
    const responseTime = (endTimeMs - startTimeMs) / 1000 // Convert milliseconds to seconds

    const chatData = {
      prompt: prompt,
      userNote: currentNote,
      modelId: modelId,
      noteId: reqData.note_id,
      evaluationScore: evaluation.score,
      responseTime: responseTime,
      startTime: startTime,
      endTime: endTime,
      sentiment: evaluation.sentiment,
      evaluation: evaluation.evaluation,
      bedrockResponse: evaluation,
      userId: userId,
    }

    const chat = await Chat.create(chatData)

    // Update session with AI score and status
    const aiScore = evaluation.score
    let aiStatus = AiStatusEnum.not_reviewed

    // Determine AI status based on score
    if (aiScore >= aiScoreThresholds.passed) {
      aiStatus = AiStatusEnum.passed
    } else if (aiScore < aiScoreThresholds.failed) {
      aiStatus = AiStatusEnum.failed
    } else {
      aiStatus = AiStatusEnum.warning
    }

    await session
      .merge({
        aiScore: aiScore,
        aiStatus: aiStatus,
      })
      .save()

    return sendSuccess('Chat created and evaluated successfully', chat)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const getChatById = async (chatId: number) => {
  try {
    const chat = await Chat.query().where('id', chatId).preload('user').first()

    if (!chat) {
      return sendError('Chat not found')
    }

    return sendSuccess('Chat retrieved successfully', chat)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const updateChat = async (reqData: updateChatValidatorInterface, chatId: number) => {
  try {
    const chat = await Chat.find(chatId)

    if (!chat) {
      return sendError('Chat not found')
    }

    // If prompt or user_note is updated, re-evaluate
    if (reqData.prompt || reqData.user_note) {
      const prompt = reqData.prompt || chat.prompt
      const userNote = reqData.user_note || chat.userNote
      const modelId = reqData.model_id || chat.modelId

      if (!prompt) {
        return sendError('Prompt is required for evaluation')
      }

      // Use default temperature for update (agent not available)
      const temperature = aiDefaultConfig.temperature
      const topP = aiDefaultConfig.top_p ?? 0.9
      const topK = aiDefaultConfig.top_k ?? 250

      // Record start time before Bedrock evaluation
      const startTimeMs = Date.now()
      const startTime = DateTime.fromMillis(startTimeMs)

      const evaluation = await evaluateChatWithBedrock(
        modelId,
        userNote,
        undefined,
        prompt,
        temperature,
        topP,
        topK
      )

      // Record end time and calculate response time in seconds
      const endTimeMs = Date.now()
      const endTime = DateTime.fromMillis(endTimeMs)
      const responseTime = (endTimeMs - startTimeMs) / 1000 // Convert milliseconds to seconds

      chat.evaluationScore = evaluation.score
      chat.responseTime = responseTime
      chat.startTime = startTime
      chat.endTime = endTime
      chat.sentiment = evaluation.sentiment
      chat.evaluation = evaluation.evaluation
      chat.bedrockResponse = evaluation

      // Update session with AI score and status
      const session = await Session.query().where('note_id', chat.noteId).first()
      if (session) {
        const aiScore = evaluation.score
        let aiStatus = AiStatusEnum.not_reviewed

        // Determine AI status based on score
        if (aiScore >= aiScoreThresholds.passed) {
          aiStatus = AiStatusEnum.passed
        } else if (aiScore < aiScoreThresholds.failed) {
          aiStatus = AiStatusEnum.failed
        } else {
          aiStatus = AiStatusEnum.warning
        }

        await session
          .merge({
            aiScore: aiScore,
            aiStatus: aiStatus,
          })
          .save()
      }
    }

    // Update other fields
    if (reqData.prompt) chat.prompt = reqData.prompt
    if (reqData.user_note) chat.userNote = reqData.user_note
    if (reqData.model_id) chat.modelId = reqData.model_id
    if (reqData.evaluation_score !== undefined) chat.evaluationScore = reqData.evaluation_score
    if (reqData.sentiment) chat.sentiment = reqData.sentiment
    if (reqData.evaluation) chat.evaluation = reqData.evaluation

    await chat.save()
    return sendSuccess('Chat updated successfully', chat)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const deleteChat = async (chatId: number) => {
  try {
    const chat = await Chat.find(chatId)

    if (!chat) {
      return sendError('Chat not found')
    }

    await chat.delete()
    return sendSuccess('Chat deleted successfully')
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const listChats = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortChat: any
    let chatListings: any = Chat.query().preload('user')

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
    let sortQuery = sortChat?.query ?? query
    let chatListingPaginated = await paginateQuery(sortQuery, pageSize, page)
    return {
      status: true,
      message: 'Chats listed successfully',
      data: {
        count: chatListingPaginated['rows'].length,
        total_count: chatListingPaginated.total,
        total_page_count: chatListingPaginated.lastPage,
        page: chatListingPaginated.currentPage,
        page_size: chatListingPaginated.perPage,
        data: chatListingPaginated['rows'].map((chat: any) => ({
          ...chat.serialize(),
        })),
      },
    }
  } catch (error: any) {
    throw new Error(`Error retrieving chats: ${error.message}`)
  }
}

export const reevaluateChat = async (chatId: number) => {
  try {
    const chat = await Chat.find(chatId)

    if (!chat) {
      return sendError('Chat not found')
    }

    // Get current session
    const session = await Session.query().where('note_id', chat.noteId).first()

    if (!session) {
      return sendError('Session not found for this chat')
    }

    // Get previous session for comparison
    const previousSession = await Session.query()
      .where('practitioner_id', session.practitionerId)
      .where('created_at', '<', session.createdAt.toSQL()!)
      .orderBy('created_at', 'desc')
      .first()

    const previousNote = previousSession?.session || undefined

    if (!chat.prompt) {
      return sendError('Chat prompt is required for re-evaluation')
    }

    // Use default temperature for re-evaluation (agent not available)
    const temperature = aiDefaultConfig.temperature
    const topP = aiDefaultConfig.top_p ?? 0.9
    const topK = aiDefaultConfig.top_k ?? 250

    // Record start time before Bedrock evaluation
    const startTimeMs = Date.now()
    const startTime = DateTime.fromMillis(startTimeMs)

    // Re-evaluate with Bedrock
    const evaluation = await evaluateChatWithBedrock(
      chat.modelId,
      chat.userNote,
      previousNote,
      chat.prompt,
      temperature,
      topP,
      topK
    )

    // Record end time and calculate response time in seconds
    const endTimeMs = Date.now()
    const endTime = DateTime.fromMillis(endTimeMs)
    const responseTime = (endTimeMs - startTimeMs) / 1000 // Convert milliseconds to seconds

    chat.evaluationScore = evaluation.score
    chat.responseTime = responseTime
    chat.startTime = startTime
    chat.endTime = endTime
    chat.sentiment = evaluation.sentiment
    chat.evaluation = evaluation.evaluation
    chat.bedrockResponse = evaluation

    await chat.save()

    // Update session with AI score and status
    const aiScore = evaluation.score
    let aiStatus = AiStatusEnum.not_reviewed

    // Determine AI status based on score
    if (aiScore >= aiScoreThresholds.passed) {
      aiStatus = AiStatusEnum.passed
    } else if (aiScore < aiScoreThresholds.failed) {
      aiStatus = AiStatusEnum.failed
    } else {
      aiStatus = AiStatusEnum.warning
    }

    await session
      .merge({
        aiScore: aiScore,
        aiStatus: aiStatus,
      })
      .save()

    return sendSuccess('Chat re-evaluated successfully', chat)
  } catch (error: any) {
    return sendError(error.message)
  }
}
