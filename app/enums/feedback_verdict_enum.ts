export const FeedbackVerdictEnum = {
  ACCEPT: 1,
  REFUTE: 2,
} as const

export type FeedbackVerdictValue =
  (typeof FeedbackVerdictEnum)[keyof typeof FeedbackVerdictEnum]

const MCP_VERDICT_BY_VALUE: Record<FeedbackVerdictValue, string> = {
  [FeedbackVerdictEnum.ACCEPT]: 'accept',
  [FeedbackVerdictEnum.REFUTE]: 'refute',
}

/** MCP adjudication API expects "accept" / "refute" strings */
export function feedbackVerdictToMcpString(verdict: number): string {
  if (verdict === FeedbackVerdictEnum.ACCEPT) return MCP_VERDICT_BY_VALUE[FeedbackVerdictEnum.ACCEPT]
  if (verdict === FeedbackVerdictEnum.REFUTE) return MCP_VERDICT_BY_VALUE[FeedbackVerdictEnum.REFUTE]
  return MCP_VERDICT_BY_VALUE[FeedbackVerdictEnum.REFUTE]
}

export function isFeedbackVerdictValue(value: unknown): value is FeedbackVerdictValue {
  return value === FeedbackVerdictEnum.ACCEPT || value === FeedbackVerdictEnum.REFUTE
}
