import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime'
import { bedrockConfig } from '#config/services'

function getRuntimeClient(region: string) {
  return new SageMakerRuntimeClient({
    region,
    credentials: {
      accessKeyId: bedrockConfig.accessKeyId,
      secretAccessKey: bedrockConfig.secretAccessKey,
    },
  })
}

/** Turns common SageMaker / HF container shapes into a single output_text string. */
function normalizeEndpointOutput(parsed: unknown): { output_text: string; content?: unknown } {
  if (parsed == null) {
    return { output_text: '' }
  }
  if (typeof parsed === 'string') {
    return { output_text: parsed }
  }
  if (typeof parsed !== 'object') {
    return { output_text: String(parsed) }
  }
  const obj = parsed as Record<string, unknown>
  if (typeof obj.output_text === 'string') {
    return { output_text: obj.output_text, content: obj }
  }
  if (typeof obj.generated_text === 'string') {
    return { output_text: obj.generated_text, content: obj }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    const first = parsed[0] as Record<string, unknown>
    if (first && typeof first.generated_text === 'string') {
      return { output_text: first.generated_text, content: parsed }
    }
  }
  return { output_text: JSON.stringify(parsed), content: obj }
}

export type InvokeSageMakerOptions = {
  /** Must match the region segment of the endpoint ARN; defaults to AWS_REGION / bedrock region. */
  region?: string
  inferenceComponentName?: string
}

export const invokeSageMakerEndpoint = async (
  endpointName: string,
  input: unknown,
  options?: InvokeSageMakerOptions
): Promise<{ output_text: string; content?: unknown }> => {
  const region = options?.region ?? bedrockConfig.region
  try {
    const client = getRuntimeClient(String(region).trim())
    const command = new InvokeEndpointCommand({
      EndpointName: endpointName,
      ...(options?.inferenceComponentName
        ? { InferenceComponentName: options.inferenceComponentName }
        : {}),
      Body: typeof input === 'string' ? input : JSON.stringify(input),
      ContentType: 'application/json',
      Accept: 'application/json',
    })
    const response = await client.send(command)
    const responseBody = await response.Body!.transformToString()
    let parsed: unknown
    try {
      parsed = JSON.parse(responseBody)
    } catch {
      parsed = responseBody
    }
    return normalizeEndpointOutput(parsed)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.log('SageMaker Runtime Error:', message, { endpointName, region })
    throw new Error(
      `SageMaker invoke failed (${region}, endpoint "${endpointName}"): ${message}. ` +
        `If this is an inference-component endpoint, set SAGEMAKER_INFERENCE_COMPONENT_NAME in .env. ` +
        `Otherwise verify with AWS CLI (same credentials as the app): ` +
        `aws sts get-caller-identity && aws sagemaker describe-endpoint --endpoint-name ${JSON.stringify(endpointName)} --region ${JSON.stringify(region)}.`
    )
  }
}
