export const modelAgents = [
  'gpt-5-mini',
  'gpt-4.1',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'anthropic.claude-3-5-sonnet-20241022-v1:0',
  'anthropic.claude-3-opus-20240229-v1:0',
  'anthropic.claude-3-sonnet-20240229-v1:0',
  'anthropic.claude-3-haiku-20240307-v1:0',
  'anthropic.claude-3-5-haiku-20241022-v2:0',
  'anthropic.claude-3-5-haiku-20241022-v1:0',
] as const

export const agentModelKeys = {
  GPT_5_MINI: 'gpt-5-mini',
  GPT_4_1: 'gpt-4.1',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
  CLAUDE_3_5_SONNET_V2: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  CLAUDE_3_5_SONNET_V1: 'anthropic.claude-3-5-sonnet-20241022-v1:0',
  CLAUDE_3_OPUS: 'anthropic.claude-3-opus-20240229-v1:0',
  CLAUDE_3_SONNET: 'anthropic.claude-3-sonnet-20240229-v1:0',
  CLAUDE_3_HAIKU: 'anthropic.claude-3-haiku-20240307-v1:0',
  CLAUDE_3_5_HAIKU_V2: 'anthropic.claude-3-5-haiku-20241022-v2:0',
  CLAUDE_3_5_HAIKU_V1: 'anthropic.claude-3-5-haiku-20241022-v1:0',
} as const

export const agentTypes = {
  system: 1,
  soap: 2,
  custom: 3,
}
