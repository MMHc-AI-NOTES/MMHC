export const AuditActionEnum = {
  chatCreated: 'chat_created',
  emailSmeIssues: 'email_sme_issues',
  emailBulkSmeIssues: 'email_bulk_sme_issues',
  emailMissingFields: 'email_missing_fields',
  webhookSessionReceived: 'webhook_session_received',
  noteMarkedReviewed: 'note_marked_reviewed',
  feedbackSubmitted: 'feedback_submitted',
  smeAssignedToManager: 'sme_assigned_to_manager',
} as const
