// Chat Severity Enum
export const ChatSeverityEnum = {
  minor: 1,
  moderate: 2,
  critical: 3,
}

// Chat Trigger Source Enum
export const ChatTriggerSourceEnum = {
  webhook: 1,
  rerun: 2,
}

// Chat Result Enum
export const ChatResultEnum = {
  pass: 1,
  fail: 2,
  error: 3,
}

// AI review provider stored on each chat record
export const ChatAiReviewEnum = {
  bedrock: 'bedrock',
  mcp: 'mcp',
} as const

export type ChatAiReview = (typeof ChatAiReviewEnum)[keyof typeof ChatAiReviewEnum]
