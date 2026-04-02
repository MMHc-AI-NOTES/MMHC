export const modelAgents = [
  'anthropic.claude-3-haiku-20240307-v1:0',
  'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  'us.anthropic.claude-sonnet-4-6',
  'meta.llama4-scout-17b-instruct-v1:0',
  'openai.gpt-oss-safeguard-120b',
  'us.amazon.nova-premier-v1:0',
  'arn:aws:bedrock:us-east-1:199990519622:custom-model-deployment/y5k4mxdxqxbx',
  'arn:aws:bedrock:us-east-1:199990519622:custom-model-deployment/sugrzn0ke8p6',
  'arn:aws:sagemaker:us-east-1:199990519622:endpoint/mmh-compliance-fixed-CORRECT',
  'arn:aws:sagemaker:us-east-1:199990519622:endpoint/mmh-compliance-V5',
  'arn:aws:bedrock:us-east-1:199990519622:custom-model-deployment/cxwsnnx1qsw8',
] as const

export const agentModelKeys = {
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
  CLAUDE_3_5_HAIKU_V1: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
  CLAUDE_4_5_HAIKU_V1: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  CLAUDE_4_5_SONNET_V1: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  CLAUDE_4_6_SONNET: 'us.anthropic.claude-sonnet-4-6',
  LLAMA_4_SCOUT_17B: 'meta.llama4-scout-17b-instruct-v1:0',
  GPT_OSS_SAFEGUARD_120B: 'openai.gpt-oss-safeguard-120b',
  NOVA_PREMIER: 'us.amazon.nova-premier-v1:0',
  CUSTOM_DEPLOYMENT_V1_15032026:
    'arn:aws:bedrock:us-east-1:199990519622:custom-model-deployment/y5k4mxdxqxbx',
  CUSTOM_DEPLOYMENT_V2_28032026:
    'arn:aws:bedrock:us-east-1:199990519622:custom-model-deployment/sugrzn0ke8p6',
  SAGEMAKER_ENDPOINT:
    'arn:aws:sagemaker:us-east-1:199990519622:endpoint/mmh-compliance-fixed-CORRECT',
  SAGEMAKER_ENDPOINT_V2: 'arn:aws:sagemaker:us-east-1:199990519622:endpoint/mmh-compliance-V5',
  CUSTOM_DEPLOYMENT_V3_02042026:
    'arn:aws:bedrock:us-east-1:199990519622:custom-model-deployment/cxwsnnx1qsw8',
} as const

export const customChatDeploymentModels = [
  agentModelKeys.CUSTOM_DEPLOYMENT_V1_15032026,
  agentModelKeys.CUSTOM_DEPLOYMENT_V2_28032026,
  agentModelKeys.SAGEMAKER_ENDPOINT,
  agentModelKeys.SAGEMAKER_ENDPOINT_V2,
  agentModelKeys.CUSTOM_DEPLOYMENT_V3_02042026,
] as const
