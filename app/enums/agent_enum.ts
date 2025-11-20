export const modelAgents = [
  'gpt-5-mini',
  'gpt-4.1',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const

export const agentModelKeys = {
  GPT_5_MINI: 'gpt-5-mini',
  GPT_4_1: 'gpt-4.1',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',
} as const

export const agentTypes = {
  system: 1,
  soap: 2,
  custom: 3,
}
