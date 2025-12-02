// Session Type Enum
export const SessionTypeEnum = {
  // Add your session types here
  // Example: standard: 1, followup: 2, etc.
  default: 1,
}

// AI Status Enum
export const AiStatusEnum = {
  passed: 1,
  failed: 2,
  warning: 3,
  not_reviewed: 4,
  needs_review: 5,
}

// Human Review Enum
export const HumanReviewEnum = {
  not_needed: 1,
  completed: 2,
  pending: 3,
}

// Manager Enum
export const ManagerEnum = {
  not_needed: 1,
  pending: 2,
  in_progress: 3,
}

// Workflow Enum
export const WorkflowEnum = {
  completed: 1,
  in_queue: 2,
  returned: 3,
  blacklisted: 4,
}

// Priority Enum
export const PriorityEnum = {
  low: 1,
  medium: 2,
  high: 3,
}
