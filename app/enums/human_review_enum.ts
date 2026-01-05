// Human Review Decision Enum
export const HumanReviewDecisionEnum = {
  accept_ai_evaluation: 1,
  ai_incorrect_override_score: 2,
  clinically_acceptable_despite_ai_issues: 3,
  needs_practitioner_correction: 4,
  escalate_to_office_manager: 5,
}

// Human Review Result Enum
export const HumanReviewResultEnum = {
  pass: 1,
  fail: 2,
}
