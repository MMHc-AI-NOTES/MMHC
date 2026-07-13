import env from '#start/env'
import { ChatAiReviewEnum, type ChatAiReview } from '#enums/chat_enum'
import { evaluateChatWithMcp } from '#services/mcp_service'
import type { NormalizedEvaluationResult } from '#interfaces/mcp_interface'

// ─── Param Types ──────────────────────────────────────────────────────────────

interface BedrockParams {
  provider: typeof ChatAiReviewEnum.bedrock
  currentNote: string
  previousNote?: string
  modelId: string
  systemPrompt: string
  temperature: number
  topP?: number | null
  topK?: number | null
}

interface McpParams {
  provider: typeof ChatAiReviewEnum.mcp
  currentNote: string
  previousNote?: string
  noteId: string
  clientId: string
  cptCode: string
  diagnosis: Record<string, any>[]
}

type EvaluationParams = BedrockParams | McpParams

// ─── Provider helper ──────────────────────────────────────────────────────────

export function getProvider(): ChatAiReview {
  const raw = String(env.get('AI_REVIEW') ?? ChatAiReviewEnum.bedrock).toLowerCase()

  return raw === ChatAiReviewEnum.mcp ? ChatAiReviewEnum.mcp : ChatAiReviewEnum.bedrock
}

export function getChatAiReview(): ChatAiReview {
  return getProvider()
}

// ─── Params builder (use this in chat_service.ts) ─────────────────────────────

export function buildEvaluationParams(data: {
  currentNote: string
  previousNote?: string

  // Bedrock
  modelId?: string
  systemPrompt?: string
  temperature?: number
  topP?: number | null
  topK?: number | null

  // MCP
  noteId?: string
  clientId?: string
  cptCode?: string
  diagnosis?: Record<string, any>[]
}): EvaluationParams {
  const provider = getProvider()

  if (provider === ChatAiReviewEnum.mcp) {
    if (!data.noteId) {
      throw new Error(`noteId is required when AI_REVIEW=${ChatAiReviewEnum.mcp}`)
    }

    if (!data.clientId) {
      throw new Error(`clientId is required when AI_REVIEW=${ChatAiReviewEnum.mcp}`)
    }

    return {
      provider: ChatAiReviewEnum.mcp,
      currentNote: data.currentNote,
      previousNote: data.previousNote,
      noteId: data.noteId,
      clientId: data.clientId,
      cptCode: data.cptCode ?? '',
      diagnosis: data.diagnosis ?? [],
    }
  }

  // BEDROCK
  if (!data.modelId) {
    throw new Error(`modelId is required when AI_REVIEW=${ChatAiReviewEnum.bedrock}`)
  }

  if (!data.systemPrompt) {
    throw new Error(`systemPrompt is required when AI_REVIEW=${ChatAiReviewEnum.bedrock}`)
  }

  return {
    provider: ChatAiReviewEnum.bedrock,
    currentNote: data.currentNote,
    previousNote: data.previousNote,
    modelId: data.modelId,
    systemPrompt: data.systemPrompt,
    temperature: data.temperature ?? 0.3,
    topP: data.topP,
    topK: data.topK,
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export async function evaluateNote(params: EvaluationParams): Promise<NormalizedEvaluationResult> {
  console.log(`[EvaluationRouter] Provider: ${params.provider}`)

  if (params.provider === ChatAiReviewEnum.mcp) {
    return evaluateChatWithMcp({
      noteId: params.noteId,
      clientId: params.clientId,
      cptCode: params.cptCode,
      diagnosis: params.diagnosis,
      currentNote: params.currentNote,
      previousNote: params.previousNote,
    })
  }

  const { evaluateChatWithBedrock } = await import('#services/bedrock_service')

  return evaluateChatWithBedrock(
    params.modelId,
    params.currentNote,
    params.previousNote,
    params.systemPrompt,
    params.temperature,
    params.topP,
    params.topK
  )
}
