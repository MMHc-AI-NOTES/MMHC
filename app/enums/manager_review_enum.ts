// Manager Review Decision Enum
export const ManagerReviewDecisionEnum = {
  approve_note_valid_and_compliant: 1,
  reject_note_send_back_to_practitioner: 2,
  reject_note_requires_practitioner_correction_cycle: 3,
  ai_evaluation_incorrect_escalate_to_ai_team: 4,
  require_sme_review: 5,
  unlock_note_for_manual_editing: 6,
  add_internal_audit_note_only_no_workflow_action: 7,
}
