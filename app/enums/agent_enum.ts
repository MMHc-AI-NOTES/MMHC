// Free/Low-cost Claude Haiku models only
// Models are automatically enabled in Bedrock (no manual activation needed)
// Haiku models support on-demand and are free/low-cost
// Note: Claude 3.5 models require inference profile format (with region prefix)
export const modelAgents = [
  'anthropic.claude-3-haiku-20240307-v1:0', // Most stable, widely available
  'us.anthropic.claude-3-5-haiku-20241022-v1:0', // Claude 3.5 Haiku v1 (inference profile)
] as const

export const agentModelKeys = {
  // Free/Low-cost models (on-demand support)
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
  CLAUDE_3_5_HAIKU_V1: 'us.anthropic.claude-3-5-haiku-20241022-v1:0', // Inference profile format
} as const
