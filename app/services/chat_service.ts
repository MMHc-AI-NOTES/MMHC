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

    // Get agent (prompt) from prompt_id (agent_id) and preload agent prompts
    const agent = await Agent.query().where('id', reqData.prompt_id).preload('prompts').first()

    if (!agent) {
      console.log('Error in createChat: Agent not found for prompt_id:', reqData.prompt_id)
      throw new Error('Agent not found for the provided prompt')
    }

    if (!agent.model) {
      console.log(
        'Error in createChat: Agent model is not configured for agent_id:',
        reqData.prompt_id
      )
      throw new Error('Agent model is not configured')
    }

    // Get all agent prompts
    const agentPrompts = agent.prompts

    if (!agentPrompts || agentPrompts.length === 0) {
      console.log('Error in createChat: No agent prompts found for agent_id:', reqData.prompt_id)
      throw new Error('No agent prompts found for this agent')
    }

    // Get all previous sessions for the same patient (for better evaluation based on patient history)
    // Filter sessions created before the current session and order by created_at desc (most recent previous session first)
    const previousSessions =
      session.patientId !== null
        ? await Session.query()
            .where('patient_id', session.patientId)
            .where('created_at', '<', session.createdAt.toJSDate())
            .orderBy('created_at', 'desc')
        : []

    // Use session.session as current note
    const currentNote = session.session
    const previousNotes = previousSessions.map((prevSession) => prevSession.session).filter(Boolean)

    // Record start time before Bedrock evaluation
    const startTimeMs = Date.now()
    const startTime = DateTime.fromMillis(startTimeMs)

    // Helper function to add delay between batches
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Helper function to retry with exponential backoff for rate limit errors
    const retryWithBackoff = async (
      fn: () => Promise<any>,
      maxRetries: number = 3,
      baseDelay: number = 1000
    ): Promise<any> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await fn()
        } catch (error: any) {
          if (error.isRateLimit && attempt < maxRetries - 1) {
            const delayMs = baseDelay * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
            console.log(
              `Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
            )
            await delay(delayMs)
            continue
          }
          throw error
        }
      }
    }

    // Step 1: Run all prompts individually to calculate scores for each
    // Process in smaller batches with longer delays to avoid rate limiting
    const BATCH_SIZE = 2 // Reduced to 2 prompts at a time
    const individualEvaluationResults = []

    for (let i = 0; i < agentPrompts.length; i += BATCH_SIZE) {
      const batch = agentPrompts.slice(i, i + BATCH_SIZE)

      // Process batch in parallel with retry logic
      // Skip validation for individual prompts (only aggregator will have validation)
      const batchPromises = batch.map((agentPrompt) =>
        retryWithBackoff(
          () =>
            evaluateChatWithBedrock(
              agentPrompt.modelId,
              currentNote,
              previousNotes.length > 0 ? previousNotes : undefined,
              agentPrompt.prompt,
              agentPrompt.temperature ?? 0.3,
              agentPrompt.topP ?? null,
              agentPrompt.topK ?? null,
              true // skipValidation = true for individual prompts
            ).then((evaluation) => {
              // Remove validation_result from individual prompt evaluations
              const evaluationWithoutValidation = { ...evaluation }
              delete evaluationWithoutValidation.validation_result
              return {
                key: agentPrompt.key,
                score: evaluation.score || 0,
                evaluation: evaluationWithoutValidation,
              }
            }),
          3, // maxRetries
          2000 // baseDelay: 2s, 4s, 8s
        ).catch((error: any) => {
          console.error(`❌ Error evaluating prompt ${agentPrompt.key}:`, error.message)
          return {
            key: agentPrompt.key,
            score: 0,
            evaluation: {
              score: 0,
              pass: false,
              sentiment: 'neutral',
              summary: 'Not Present',
              // No validation_result for individual prompts
            },
          }
        })
      )

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      individualEvaluationResults.push(...batchResults)

      // Add longer delay between batches (except after the last batch)
      if (i + BATCH_SIZE < agentPrompts.length) {
        await delay(2000) // 2 second delay between batches
      }
    }

    // Store individual prompt scores with summary and issues for each key
    const promptScores: Record<string, any> = {}
    const allMergedIssues: Array<{
      severity: string
      points_deducted: number
      section_id?: string
      section: string
      justification: string
      reason?: string
    }> = []

    individualEvaluationResults.forEach((result) => {
      // Store summary for individual prompt keys
      // If summary is empty or "Evaluation failed", use "not present"
      const summary = result.evaluation?.summary || ''
      promptScores[result.key] = {
        summary: summary === '' || summary === 'Evaluation failed' ? 'not present' : summary,
      }

      // Extract and merge issues from individual prompt evaluations
      if (result.evaluation?.issues && Array.isArray(result.evaluation.issues)) {
        result.evaluation.issues.forEach((issue: any) => {
          // Add issues to merged array with section_id from prompt key if not present
          allMergedIssues.push({
            severity: issue.severity || 'minor',
            points_deducted: issue.points_deducted || 0,
            section_id: issue.section_id || result.key || '',
            section: issue.section || result.key || '',
            justification: issue.justification || '',
            reason: issue.reason || issue.justification || issue.section || '',
          })
        })
      }
    })

    // Step 2: Join all prompts together
    const joinedPrompts = agentPrompts
      .map((prompt) => {
        return `\n${prompt.prompt}`
      })
      .join('\n\n---\n\n')

    // Step 3: Run final evaluation with joined prompts
    // Use the first prompt's model and settings for the final evaluation
    const firstPrompt = agentPrompts[0]
    const finalEvaluation = await evaluateChatWithBedrock(
      firstPrompt.modelId,
      currentNote,
      previousNotes.length > 0 ? previousNotes : undefined,
      joinedPrompts,
      firstPrompt.temperature ?? 0.3,
      firstPrompt.topP ?? null,
      firstPrompt.topK ?? null
    )

    // Record end time and calculate response time in seconds
    const endTimeMs = Date.now()
    const endTime = DateTime.fromMillis(endTimeMs)
    const responseTime = (endTimeMs - startTimeMs) / 1000 // Convert milliseconds to seconds

    // Map validation status to severity enum
    let severity = ChatSeverityEnum.minor // default to minor
    if (finalEvaluation.validation_result) {
      if (finalEvaluation.validation_result.status === 'error') {
        severity = ChatSeverityEnum.critical
      } else if (finalEvaluation.validation_result.status === 'fail') {
        severity = ChatSeverityEnum.moderate
      } else {
        severity = ChatSeverityEnum.minor
      }
    }

    // Map validation status to result enum
    let result: number | null = null
    if (finalEvaluation.validation_result) {
      if (finalEvaluation.validation_result.status === 'pass') {
        result = ChatResultEnum.pass
      } else if (finalEvaluation.validation_result.status === 'fail') {
        result = ChatResultEnum.fail
      } else if (finalEvaluation.validation_result.status === 'error') {
        result = ChatResultEnum.error
      }
    }

    // Merge all issues: individual prompt issues + final evaluation issues
    const finalMergedIssues = [...allMergedIssues, ...(finalEvaluation.issues || [])]

    // Prepare bedrockResponse with final evaluation and prompt scores
    const bedrockResponse = {
      ...finalEvaluation,
      // Replace issues with merged issues from all prompts
      issues: finalMergedIssues,
      prompt_scores: {
        ...promptScores,
        aggregator: {
          score: finalEvaluation.score,
          pass: finalEvaluation.pass,
          status: finalEvaluation.validation_result?.status || 'unknown',
          sentiment: finalEvaluation.sentiment,
          summary: finalEvaluation.summary,
          evaluation: finalEvaluation.evaluation,
          issues: finalEvaluation.issues, // Keep original issues in aggregator
          validation_result: finalEvaluation.validation_result,
        },
      },
    }

    const chatData = {
      prompt: joinedPrompts,
      userNote: currentNote,
      userInput: finalEvaluation.user_input,
      modelId: firstPrompt.modelId,
      noteId: reqData.note_id,
      evaluationScore: finalEvaluation.score,
      responseTime: responseTime,
      startTime: startTime,
      endTime: endTime,
      sentiment: finalEvaluation.sentiment,
      evaluation: finalEvaluation.evaluation,
      bedrockResponse: bedrockResponse,
      userId: userId,
      agentId: reqData.prompt_id,
      triggerSource: ChatTriggerSourceEnum.rerun,
      severity: severity,
      result: result,
    }

    const chat = await Chat.create(chatData)

    // Update session with AI score and status
    const aiScore = finalEvaluation.score
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
    if (result === ChatResultEnum.pass) {
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

    // Get all previous sessions for the same patient (for better evaluation based on patient history)
    // Filter sessions created before the current session and order by created_at desc (most recent previous session first)
    const previousSessions =
      session.patientId !== null
        ? await Session.query()
            .where('patient_id', session.patientId)
            .where('created_at', '<', session.createdAt.toJSDate())
            .orderBy('created_at', 'desc')
        : []

    const previousNotes = previousSessions.map((prevSession) => prevSession.session).filter(Boolean)

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

    // Re-evaluate with Bedrock (with previous notes for comparison based on patient history)
    const evaluation = await evaluateChatWithBedrock(
      chat.modelId,
      chat.userNote,
      previousNotes.length > 0 ? previousNotes : undefined,
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
