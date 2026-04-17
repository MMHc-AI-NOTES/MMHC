import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime'
import { bedrockConfig } from '#config/services'

const sagemakerClient = new SageMakerRuntimeClient({
  region: bedrockConfig.region,
  credentials: {
    accessKeyId: bedrockConfig.accessKeyId,
    secretAccessKey: bedrockConfig.secretAccessKey,
  },
})

const ENDPOINT_TOKEN_LIMIT = 4096
const TOKEN_RESERVE = 64
const DEFAULT_MAX_NEW_TOKENS = 1000
const MIN_MAX_NEW_TOKENS = 64

const prepareSageMakerPayload = (input: any) => {
  if (!input || typeof input !== 'object') {
    return input
  }

  if (typeof input.inputs !== 'string') {
    return input
  }

  const payload = { ...input }
  const parameters = { ...(payload.parameters || {}) }

  // Endpoint enforces: inputs tokens + max_new_tokens <= 4096.
  // Use a conservative char->token estimate to avoid 422 validation errors.
  const estimatedInputTokens = Math.ceil(payload.inputs.length / 3.5)
  const availableOutputTokens = ENDPOINT_TOKEN_LIMIT - estimatedInputTokens - TOKEN_RESERVE
  const safeBudget = Math.min(DEFAULT_MAX_NEW_TOKENS, availableOutputTokens)

  const requested =
    typeof parameters.max_new_tokens === 'number' && Number.isFinite(parameters.max_new_tokens)
      ? Math.floor(parameters.max_new_tokens)
      : DEFAULT_MAX_NEW_TOKENS

  parameters.max_new_tokens = Math.max(1, Math.min(requested, safeBudget))

  if (parameters.max_new_tokens < MIN_MAX_NEW_TOKENS) {
    console.warn(
      `SageMaker payload near token limit: estimated_input_tokens=${estimatedInputTokens}, ` +
        `max_new_tokens=${parameters.max_new_tokens}`
    )
  }
  payload.parameters = parameters

  return payload
}

export const invokeSageMakerEndpoint = async (
  endpointName: string,
  input: any
): Promise<any> => {
  try {
    const payload = prepareSageMakerPayload(input)

    const command = new InvokeEndpointCommand({
      EndpointName: endpointName,
      Body: typeof payload === 'string' ? payload : JSON.stringify(payload),
      ContentType: 'application/json',
      Accept: 'application/json',
    })
    const response = await sagemakerClient.send(command)
    const responseBody = await response.Body.transformToString()
    const parsed = JSON.parse(responseBody)

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].generated_text) {
      return { output_text: parsed[0].generated_text, raw: parsed }
    }

    return parsed
  } catch (error: any) {
    console.log('SageMaker Runtime Error:', error.message)
    throw new Error('Failed to communicate with SageMaker endpoint.')
  }
}
