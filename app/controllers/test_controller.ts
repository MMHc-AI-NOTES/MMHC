import type { HttpContext } from '@adonisjs/core/http'
import { invokeBedrockModel } from '#services/bedrock_service'
import { testChatValidator } from '#validators/test_chat_validator'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { agentModelKeys } from '#enums/agent_enum'
import { bedrockConfig } from '#config/services'

export default class TestController {
  /**
   * Test endpoint: send a prompt at runtime and get model response.
   * For testing fine-tuned or base models without session/chat.
   */
  public async chat(ctx: HttpContext) {
    try {
      const payload = await testChatValidator.validate(ctx.request.body())

      const customModelArn = bedrockConfig.customModelArn
      const requestedModel =
        payload.model_id === 'CUSTOM_EXPERTSCLOUD' ? customModelArn : payload.model_id
      const modelId =
        (requestedModel && requestedModel.length > 0 ? requestedModel : null) ||
        agentModelKeys.CLAUDE_4_5_HAIKU_V1
      const isCustomDeployment =
        !!modelId &&
        (modelId === customModelArn ||
          modelId.includes('custom-model-deployment') ||
          modelId.includes('model-deployment'))

      // For custom deployments, require system_prompt to be explicitly provided
      if (isCustomDeployment && !payload.system_prompt) {
        return ctx.response.status(400).json({
          status: false,
          message: 'system_prompt is required for custom model deployments',
        })
      }

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

      // Debug logging
      console.log('Test chat request:', {
        modelId,
        hasSystemPrompt: !!payload.system_prompt,
        systemPromptLength: systemPrompt?.length,
        systemPromptPreview: systemPrompt?.substring(0, 100),
        userPromptLength: userPrompt?.length,
        temperature,
      })

      const bedrockResponse = await invokeBedrockModel(
        modelId,
        systemPrompt,
        userPrompt,
        temperature
      )

      const contentParts = (bedrockResponse.content ?? []).map(
        (c: { text?: string }) => c?.text ?? ''
      )
      let responseText = bedrockResponse.output_text?.trim() ?? contentParts.join('').trim()

      // Extract JSON from code blocks if present (```json ... ``` or ``` ... ```)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        responseText = codeBlockMatch[1].trim()
      } else {
        // Remove any remaining code block markers
        responseText = responseText
          .replace(/```(?:json)?/g, '')
          .replace(/```/g, '')
          .trim()
      }

      // Try to parse response as JSON
      let parsedResponse = null
      try {
        parsedResponse = JSON.parse(responseText)
      } catch (e) {
        // If parsing fails, parsedResponse remains null
      }

      return sendSuccess('Model response', {
        model_id: modelId,
        response_json: parsedResponse, // Parsed JSON object (null if not valid JSON)
      })
    } catch (error) {
      console.log('Test chat error:', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
