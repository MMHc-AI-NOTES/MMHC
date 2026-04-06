import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime'
import { bedrockConfig } from '#config/services'

const sagemakerClient = new SageMakerRuntimeClient({
  region: bedrockConfig.region,
  credentials: {
    accessKeyId: bedrockConfig.accessKeyId,
    secretAccessKey: bedrockConfig.secretAccessKey,
  },
})

export const invokeSageMakerEndpoint = async (
  endpointName: string,
  input: any
): Promise<any> => {
  try {
    const command = new InvokeEndpointCommand({
      EndpointName: endpointName,
      Body: typeof input === 'string' ? input : JSON.stringify(input),
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
