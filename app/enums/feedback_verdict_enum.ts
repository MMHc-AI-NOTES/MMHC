export const FeedbackVerdictEnum = {
  UP: 1,
  DOWN: 2,
} as const

export type FeedbackVerdictValue = (typeof FeedbackVerdictEnum)[keyof typeof FeedbackVerdictEnum]

const MCP_VERDICT_BY_VALUE: Record<FeedbackVerdictValue, string> = {
  [FeedbackVerdictEnum.UP]: 'up',
  [FeedbackVerdictEnum.DOWN]: 'down',
}

export function feedbackVerdictToMcpString(verdict: number): string {
  if (verdict === FeedbackVerdictEnum.UP) return MCP_VERDICT_BY_VALUE[FeedbackVerdictEnum.UP]
  if (verdict === FeedbackVerdictEnum.DOWN) return MCP_VERDICT_BY_VALUE[FeedbackVerdictEnum.DOWN]
  return MCP_VERDICT_BY_VALUE[FeedbackVerdictEnum.DOWN]
}

export function isFeedbackVerdictValue(value: unknown): value is FeedbackVerdictValue {
  return value === FeedbackVerdictEnum.UP || value === FeedbackVerdictEnum.DOWN
}
