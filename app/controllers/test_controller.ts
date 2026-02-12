import type { HttpContext } from '@adonisjs/core/http'
import { invokeBedrockModel } from '#services/bedrock_service'
import { testChatValidator } from '#validators/test_chat_validator'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { agentModelKeys } from '#enums/agent_enum'

/** Plain-text format: strip markdown symbols, fix newlines. No HTML. */
function formatResponseForDisplay(text: string): string {
  if (!text) return ''
  // Literal "\n" (backslash+n) from API → real newline
  let out = text.replace(/\\n/g, '\n')
  const lines = out.split('\n')
  const formattedLines = lines.map((line) => {
    const trimmed = line.trim()
    if (/^### /.test(trimmed)) return trimmed.replace(/^### (.+)$/, '$1')
    if (/^## /.test(trimmed)) return trimmed.replace(/^## (.+)$/, '$1')
    if (/^# /.test(trimmed)) return trimmed.replace(/^# (.+)$/, '$1')
    if (/^- (.+)$/.test(trimmed)) return trimmed.replace(/^- (.+)$/, '$1')
    return line
  })
  return formattedLines
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim()
}

export default class TestController {
  /**
   * Test endpoint: send a prompt at runtime and get model response.
   * For testing fine-tuned or base models without session/chat.
   */
  public async chat(ctx: HttpContext) {
    try {
      const payload = await testChatValidator.validate(ctx.request.body())

      const requestedModel =
        payload.model_id === 'CUSTOM_EXPERTSCLOUD'
          ? agentModelKeys.CUSTOM_EXPERTSCLOUD
          : payload.model_id
      const modelId =
        (requestedModel && requestedModel.length > 0 ? requestedModel : null) ||
        agentModelKeys.CLAUDE_4_5_HAIKU_V1
      const isCustomDeployment =
        !!modelId &&
        (modelId === agentModelKeys.CUSTOM_EXPERTSCLOUD ||
          modelId.includes('custom-model-deployment') ||
          modelId.includes('model-deployment'))
      const systemPrompt =
        payload.system_prompt ??
        (isCustomDeployment
          ? 'You are an assistant that answers only using the facts you were trained on about ExpertsCloud. Answer briefly and only with the information from your training. If the question is not about ExpertsCloud or you do not have the answer in your training, say you do not know.'
          : 'You are a helpful assistant.')
      const userPrompt = payload.prompt
      let temperature = payload.temperature ?? (isCustomDeployment ? 0.2 : 0.7)
      if (isCustomDeployment && temperature > 0.5) {
        temperature = 0.3
      }

      const bedrockResponse = await invokeBedrockModel(
        modelId,
        systemPrompt,
        userPrompt,
        temperature
      )

      const contentParts = (bedrockResponse.content ?? []).map(
        (c: { text?: string }) => c?.text ?? ''
      )
      const responseText = bedrockResponse.output_text?.trim() ?? contentParts.join('').trim()
      const responseFormatted = formatResponseForDisplay(responseText)

      return sendSuccess('Model response', {
        model_id: modelId,
        response: responseText,
        response_formatted: responseFormatted,
      })
    } catch (error) {
      console.log('Test chat error:', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
