import Chat, { chatFilterEnum, chatSortEnum } from '#models/chat'
import Session from '#models/session'
import Agent from '#models/agent'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess } from '#services/custom_response_service'
import { evaluateChatWithBedrock } from '#services/bedrock_service'
import { AiStatusEnum, WorkflowEnum } from '#enums/session_enum'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'
import { ChatSeverityEnum, ChatTriggerSourceEnum, ChatResultEnum } from '#enums/chat_enum'
import { aiScoreThresholds, aiDefaultConfig } from '#helpers/gemini_safety_config'
import { DateTime } from 'luxon'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import type {
  createChatValidatorInterface,
  updateChatValidatorInterface,
} from '#validators/chat_validator'

export const createChat = async (
  reqData: createChatValidatorInterface,
  userId: number,
  sessionInstance?: Session
) => {
  try {
    // Use provided session instance or query for it
    let session: Session | null = sessionInstance || null

    if (!session) {
      session = await Session.query().where('note_id', reqData.note_id).first()
    }

    if (!session) {
      console.log('Error in createChat: Session not found for note_id:', reqData.note_id)
      throw new Error('Session not found for the provided note')
    }

    // Get agent (prompt) from prompt_id (agent_id)
    const agent = await Agent.find(reqData.prompt_id)

    if (!agent) {
      console.log('Error in createChat: Agent not found for prompt_id:', reqData.prompt_id)
      throw new Error('Agent not found for the provided prompt')
    }

    if (!agent.prompt) {
      console.log(
        'Error in createChat: Agent prompt is not configured for agent_id:',
        reqData.prompt_id
      )
      throw new Error('Agent prompt is not configured')
    }

    if (!agent.model) {
      console.log(
        'Error in createChat: Agent model is not configured for agent_id:',
        reqData.prompt_id
      )
      throw new Error('Agent model is not configured')
    }

    // Get previous note from chain (same as webhook/note API: note whose parent_note_id = current)
    let previousNote: string | undefined
    const previousSession = await Session.query().where('parent_note_id', session.id).first()
    previousNote = previousSession?.session || undefined

    // Use session.session as current note and agent.prompt as prompt
    const currentNote = session.session
    const prompt = agent.prompt
    const modelId = agent.model
    const temperature = agent.temperature ?? 0.3
    const topP = agent.topP ?? 0.9
    const topK = agent.topK ?? 250

    if (!prompt) {
      console.log('Error in createChat: Agent prompt is required for evaluation')
      throw new Error('Agent prompt is required for evaluation')
    }

    // Record start time before Bedrock evaluation
    const startTimeMs = Date.now()
    const startTime = DateTime.fromMillis(startTimeMs)

    // Evaluate with Bedrock (with previous note for comparison based on patient history)
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

    // Map validation status to severity enum
    let severity = ChatSeverityEnum.minor // default to info
    if (evaluation.validation_result) {
      if (evaluation.validation_result.status === 'error') {
        severity = ChatSeverityEnum.critical
      } else if (evaluation.validation_result.status === 'fail') {
        severity = ChatSeverityEnum.moderate
      } else {
        severity = ChatSeverityEnum.minor
      }
    }

    // Map validation status to result enum
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

    const chatData = {
      prompt: prompt,
      userNote: currentNote,
      userInput: evaluation.user_input,
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
      agentId: reqData.prompt_id,
      triggerSource: ChatTriggerSourceEnum.rerun,
      severity: severity,
      result: result,
    }

    const chat = await Chat.create(chatData)

    // Audit log: chat created
    await createAuditLog({
      userId,
      description: `Chat created for note ${reqData.note_id}`,
      action: AuditActionEnum.chatCreated,
      modelType: 'Chat',
      modelId: chat.id,
      status: true,
      metadata: {
        note_id: reqData.note_id,
        chat_id: chat.id,
        agent_id: reqData.prompt_id,
      },
    })

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

    // Determine workflow based on evaluation result
    // If status is pass → completed, otherwise (fail/warning) → in_queue
    let workflow = WorkflowEnum.in_queue // default to in_queue
    if (evaluation.validation_result && evaluation.validation_result.status === 'pass') {
      workflow = WorkflowEnum.completed
    } else {
      // fail or warning or error → keep in_queue
      workflow = WorkflowEnum.in_queue
    }

    await session
      .merge({
        aiScore: aiScore,
        aiStatus: aiStatus,
        workflow: workflow,
        reviewCycle: ReviewCycleEnum.cycle_1_of_3,
      })
      .save()

    return sendSuccess('Chat created and evaluated successfully', chat)
  } catch (error: any) {
    console.log('Error in createChat:', error.message)
    throw error
  }
}

export const getChatById = async (chatId: number) => {
  try {
    const chat = await Chat.query()
      .where('id', chatId)
      .preload('user')
      .preload('agent', (agentQuery) => {
        agentQuery.select('id', 'name', 'model', 'agent_key')
      })
      .preload('humanReviews', (reviewsQuery) =>
        reviewsQuery.orderBy('id', 'desc').preload('practitioner')
      )
      .first()

    if (!chat) {
      console.log('Error in getChatById: Chat not found with id:', chatId)
      throw new Error('Chat not found')
    }

    return sendSuccess('Chat retrieved successfully', chat)
  } catch (error: any) {
    console.log('Error in getChatById:', error.message)
    throw error
  }
}

export const updateChat = async (reqData: updateChatValidatorInterface, chatId: number) => {
  try {
    const chat = await Chat.find(chatId)

    if (!chat) {
      console.log('Error in updateChat: Chat not found with id:', chatId)
      throw new Error('Chat not found')
    }

    // If prompt or user_note is updated, re-evaluate
    if (reqData.prompt || reqData.user_note) {
      const prompt = reqData.prompt || chat.prompt
      const userNote = reqData.user_note || chat.userNote
      const modelId = reqData.model_id || chat.modelId

      if (!prompt) {
        console.log('Error in updateChat: Prompt is required for evaluation')
        throw new Error('Prompt is required for evaluation')
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

      // Map validation status to severity enum
      let severity = ChatSeverityEnum.minor // default to info
      if (evaluation.validation_result) {
        if (evaluation.validation_result.status === 'error') {
          severity = ChatSeverityEnum.critical
        } else if (evaluation.validation_result.status === 'fail') {
          severity = ChatSeverityEnum.moderate
        } else {
          severity = ChatSeverityEnum.minor
        }
      }

      // Map validation status to result enum
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

      chat.evaluationScore = evaluation.score
      chat.responseTime = responseTime
      chat.startTime = startTime
      chat.endTime = endTime
      chat.sentiment = evaluation.sentiment
      chat.evaluation = evaluation.evaluation
      chat.bedrockResponse = evaluation
      chat.severity = severity
      chat.result = result

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
    console.log('Error in updateChat:', error.message)
    throw error
  }
}

export const deleteChat = async (chatId: number) => {
  try {
    const chat = await Chat.find(chatId)

    if (!chat) {
      console.log('Error in deleteChat: Chat not found with id:', chatId)
      throw new Error('Chat not found')
    }

    await chat.delete()
    return sendSuccess('Chat deleted successfully')
  } catch (error: any) {
    console.log('Error in deleteChat:', error.message)
    throw error
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
    let chatListings: any = Chat.query()
      .preload('user')
      .preload('agent', (agentQuery) => {
        agentQuery.select('id', 'name', 'model', 'agent_key')
      })
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
    console.log('Error in listChats:', error.message)
    throw new Error('Failed to retrieve chats. Please try again later.')
  }
}

export const reevaluateChat = async (chatId: number) => {
  try {
    const chat = await Chat.find(chatId)

    if (!chat) {
      console.log('Error in reevaluateChat: Chat not found with id:', chatId)
      throw new Error('Chat not found')
    }

    // Get current session
    const session = await Session.query().where('note_id', chat.noteId).first()

    if (!session) {
      console.log('Error in reevaluateChat: Session not found for note_id:', chat.noteId)
      throw new Error('Session not found for this chat')
    }

    // Get previous note from chain (same as webhook/note API: note whose parent_note_id = current)
    let previousNote: string | undefined
    const previousSession = await Session.query().where('parent_note_id', session.id).first()
    previousNote = previousSession?.session || undefined

    if (!chat.prompt) {
      console.log(
        'Error in reevaluateChat: Chat prompt is required for re-evaluation, chat_id:',
        chatId
      )
      throw new Error('Chat prompt is required for re-evaluation')
    }

    // Use default temperature for re-evaluation (agent not available)
    const temperature = aiDefaultConfig.temperature
    const topP = aiDefaultConfig.top_p ?? 0.9
    const topK = aiDefaultConfig.top_k ?? 250

    // Record start time before Bedrock evaluation
    const startTimeMs = Date.now()
    const startTime = DateTime.fromMillis(startTimeMs)

    // Re-evaluate with Bedrock (with previous note for comparison based on patient history)
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

    // Map validation status to severity enum
    let severity = ChatSeverityEnum.minor // default to info
    if (evaluation.validation_result) {
      if (evaluation.validation_result.status === 'error') {
        severity = ChatSeverityEnum.critical
      } else if (evaluation.validation_result.status === 'fail') {
        severity = ChatSeverityEnum.moderate
      } else {
        severity = ChatSeverityEnum.minor
      }
    }

    // Map validation status to result enum
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

    chat.evaluationScore = evaluation.score
    chat.responseTime = responseTime
    chat.startTime = startTime
    chat.endTime = endTime
    chat.sentiment = evaluation.sentiment
    chat.evaluation = evaluation.evaluation
    chat.bedrockResponse = evaluation
    chat.userInput = evaluation.user_input
    chat.severity = severity
    chat.result = result

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

    // Determine workflow based on evaluation result
    // If status is pass → completed, otherwise (fail/warning) → in_queue
    let workflow = WorkflowEnum.in_queue // default to in_queue
    if (evaluation.validation_result && evaluation.validation_result.status === 'pass') {
      workflow = WorkflowEnum.completed
    } else {
      // fail or warning or error → keep in_queue
      workflow = WorkflowEnum.in_queue
    }

    await session
      .merge({
        aiScore: aiScore,
        aiStatus: aiStatus,
        workflow: workflow,
        reviewCycle: ReviewCycleEnum.cycle_1_of_3,
      })
      .save()

    return sendSuccess('Chat re-evaluated successfully', chat)
  } catch (error: any) {
    console.log('Error in reevaluateChat:', error.message)
    throw error
  }
}
