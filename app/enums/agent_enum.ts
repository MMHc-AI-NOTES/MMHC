// Models available in Bedrock
// Models are automatically enabled in Bedrock (no manual activation needed)
// Note: Claude 3.5+ models use inference profile format (with region prefix)
export const modelAgents = [
  'anthropic.claude-3-haiku-20240307-v1:0', // Most stable, widely available
  'us.anthropic.claude-3-5-haiku-20241022-v1:0', // Claude 3.5 Haiku v1 (inference profile)
  'us.anthropic.claude-haiku-4-5-20251001-v1:0', // Claude 4.5 Haiku v1 (inference profile)
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0', // Claude Sonnet 4.5 (inference profile format)
  'us.anthropic.claude-sonnet-4-6', // Claude Sonnet 4.6 (inference profile)
  'meta.llama4-scout-17b-instruct-v1:0', // Llama 4 Scout 17B (base ID)
  'openai.gpt-oss-safeguard-120b', // GPT OSS Safeguard 120B (base ID)
  'us.amazon.nova-premier-v1:0', // Nova Premier (inference profile - cross-region)
] as const

export const agentModelKeys = {
  // Free/Low-cost models (on-demand support)
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
  CLAUDE_3_5_HAIKU_V1: 'us.anthropic.claude-3-5-haiku-20241022-v1:0', // Inference profile format
  CLAUDE_4_5_HAIKU_V1: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', // Inference profile format
  CLAUDE_4_5_SONNET_V1: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', // Claude Sonnet 4.5
  CLAUDE_4_6_SONNET: 'us.anthropic.claude-sonnet-4-6', // Claude Sonnet 4.6 (inference profile)
  LLAMA_4_SCOUT_17B: 'meta.llama4-scout-17b-instruct-v1:0', // Llama 4 Scout 17B
  GPT_OSS_SAFEGUARD_120B: 'openai.gpt-oss-safeguard-120b', // GPT OSS Safeguard 120B
  NOVA_PREMIER: 'us.amazon.nova-premier-v1:0', // Nova Premier (inference profile)
} as const
