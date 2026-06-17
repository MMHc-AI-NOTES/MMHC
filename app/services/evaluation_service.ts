import env from '#start/env'
import { ChatAiReviewEnum, type ChatAiReview } from '#enums/chat_enum'
import { evaluateChatWithMcp } from '#services/mcp_service'
import type { NormalizedEvaluationResult } from '#services/mcp_service'

// ─── Param Types ──────────────────────────────────────────────────────────────

interface BedrockParams {
  provider: 'BEDROCK'
  currentNote: string
  previousNote?: string
  modelId: string
  systemPrompt: string
  temperature: number
  topP?: number | null
  topK?: number | null
}

interface McpParams {
  provider: 'MCP'
  currentNote: unknown
  previousNote?: unknown
  noteId: string
  clientId: string
}

type EvaluationParams = BedrockParams | McpParams

// ─── Provider helper ──────────────────────────────────────────────────────────

export function getProvider(): 'BEDROCK' | 'MCP' {
  const raw = String(env.get('AI_REVIEW') ?? 'BEDROCK').toUpperCase()
  return raw === 'MCP' ? 'MCP' : 'BEDROCK'
}

export function getChatAiReview(): ChatAiReview {
  return getProvider() === 'MCP' ? ChatAiReviewEnum.mcp : ChatAiReviewEnum.bedrock
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
}): EvaluationParams {
  const provider = getProvider()

  if (provider === 'MCP') {
    if (!data.noteId) throw new Error('noteId is required when AI_REVIEW=MCP')
    if (!data.clientId) throw new Error('clientId is required when AI_REVIEW=MCP')

    return {
      provider: 'MCP',
      currentNote: data.currentNote,
      previousNote: data.previousNote,
      noteId: data.noteId,
      clientId: data.clientId,
    }
  }

  // BEDROCK
  if (!data.modelId) throw new Error('modelId is required when AI_REVIEW=BEDROCK')
  if (!data.systemPrompt) throw new Error('systemPrompt is required when AI_REVIEW=BEDROCK')

  return {
    provider: 'BEDROCK',
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

export async function evaluateNote(
  params: EvaluationParams
): Promise<NormalizedEvaluationResult> {
  console.log(`[EvaluationRouter] Provider: ${params.provider}`)

  if (params.provider === 'MCP') {
    return evaluateChatWithMcp({
      noteId: params.noteId,
      clientId: params.clientId,
      currentNote: params.currentNote,
      previousNote: params.previousNote,
    })
  }

  // BEDROCK — loaded only when AI_REVIEW=BEDROCK
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