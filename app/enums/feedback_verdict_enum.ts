export const FeedbackVerdictEnum = {
  UP: {
    id: 1,
    label: 'ACCEPT',
    mcp_label: 'accept',
  },
  DOWN: {
    id: 2,
    label: 'REJECT',
    mcp_label: 'reject',
  },
} as const

export type FeedbackVerdictKey = keyof typeof FeedbackVerdictEnum
export type FeedbackVerdictValue = (typeof FeedbackVerdictEnum)[FeedbackVerdictKey]['id']

const VERDICT_BY_ID: Record<FeedbackVerdictValue, (typeof FeedbackVerdictEnum)[FeedbackVerdictKey]> =
  {
    [FeedbackVerdictEnum.UP.id]: FeedbackVerdictEnum.UP,
    [FeedbackVerdictEnum.DOWN.id]: FeedbackVerdictEnum.DOWN,
  }

export const FEEDBACK_VERDICT_IDS = [
  FeedbackVerdictEnum.UP.id,
  FeedbackVerdictEnum.DOWN.id,
] as const

/** MCP adjudication API expects "accept" / "reject" strings */
export function feedbackVerdictToMcpString(verdict: number): string {
  return VERDICT_BY_ID[verdict as FeedbackVerdictValue]?.mcp_label ?? FeedbackVerdictEnum.DOWN.mcp_label
}

export function isFeedbackVerdictValue(value: unknown): value is FeedbackVerdictValue {
  return value === FeedbackVerdictEnum.UP.id || value === FeedbackVerdictEnum.DOWN.id
}
