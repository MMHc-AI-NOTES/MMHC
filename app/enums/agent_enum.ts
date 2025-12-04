// Free/Low-cost Claude Haiku models only
// Models are automatically enabled in Bedrock (no manual activation needed)
// Haiku models support on-demand and are free/low-cost
export const modelAgents = [
  'anthropic.claude-3-haiku-20240307-v1:0', // Most stable, widely available
  'anthropic.claude-3-5-haiku-20241022-v2:0', // Latest version
  'anthropic.claude-3-5-haiku-20241022-v1:0', // Previous version
] as const

export const agentModelKeys = {
  // Free/Low-cost models (on-demand support)
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
  CLAUDE_3_5_HAIKU_V2: 'anthropic.claude-3-5-haiku-20241022-v2:0',
  CLAUDE_3_5_HAIKU_V1: 'anthropic.claude-3-5-haiku-20241022-v1:0',
} as const
