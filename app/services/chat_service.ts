import Chat, { chatFilterEnum, chatSortEnum } from '#models/chat'
import Session from '#models/session'
import Agent from '#models/agent'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess } from '#services/custom_response_service'
import { evaluateChatWithBedrock } from '#services/bedrock_service'
import type {
  createChatValidatorInterface,
  updateChatValidatorInterface,
} from '#validators/chat_validator'

export const createChat = async (reqData: createChatValidatorInterface, userId: number) => {
  try {
    // Get session from note_id
    const session = await Session.query().where('note_id', reqData.note_id).first()

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

    if (!prompt) {
      console.log('Error in createChat: Agent prompt is required for evaluation')
      throw new Error('Agent prompt is required for evaluation')
    }

    // Evaluate with Bedrock (with previous note for comparison)
    const evaluation = await evaluateChatWithBedrock(
      modelId,
      currentNote,
      previousNote,
      prompt,
      temperature
    )

    const chatData = {
      prompt: prompt,
      userNote: currentNote,
      modelId: modelId,
      noteId: reqData.note_id,
      evaluationScore: evaluation.score,
      sentiment: evaluation.sentiment,
      evaluation: evaluation.evaluation,
      bedrockResponse: evaluation,
      userId: userId,
    }

    const chat = await Chat.create(chatData)
    return sendSuccess('Chat created and evaluated successfully', chat)
  } catch (error: any) {
    console.log('Error in createChat:', error.message)
    throw error
  }
}

export const getChatById = async (chatId: number) => {
  try {
    const chat = await Chat.query().where('id', chatId).preload('user').first()

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
      const temperature = 0.3
      const evaluation = await evaluateChatWithBedrock(
        modelId,
        userNote,
        undefined,
        prompt,
        temperature
      )

      chat.evaluationScore = evaluation.score
      chat.sentiment = evaluation.sentiment
      chat.evaluation = evaluation.evaluation
      chat.bedrockResponse = evaluation
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

    // Get previous session for comparison
    const previousSession = await Session.query()
      .where('practitioner_id', session.practitionerId)
      .where('created_at', '<', session.createdAt.toSQL()!)
      .orderBy('created_at', 'desc')
      .first()

    const previousNote = previousSession?.session || undefined

    if (!chat.prompt) {
      console.log(
        'Error in reevaluateChat: Chat prompt is required for re-evaluation, chat_id:',
        chatId
      )
      throw new Error('Chat prompt is required for re-evaluation')
    }

    // Use default temperature for re-evaluation (agent not available)
    const temperature = 0.3
    // Re-evaluate with Bedrock
    const evaluation = await evaluateChatWithBedrock(
      chat.modelId,
      chat.userNote,
      previousNote,
      chat.prompt,
      temperature
    )

    chat.evaluationScore = evaluation.score
    chat.sentiment = evaluation.sentiment
    chat.evaluation = evaluation.evaluation
    chat.bedrockResponse = evaluation

    await chat.save()
    return sendSuccess('Chat re-evaluated successfully', chat)
  } catch (error: any) {
    console.log('Error in reevaluateChat:', error.message)
    throw error
  }
}
