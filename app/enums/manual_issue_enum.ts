// Error Type Enum (with points deduction)
export const ErrorTypeEnum = {
  minor: 1, // -5 pts
  moderate: 2, // -15 pts
  critical: 3, // -25 pts
}

// Error Type Display Names
export const ErrorTypeDisplayNames: Record<number, string> = {
  1: 'Minor (-5 pts)',
  2: 'Moderate (-15 pts)',
  3: 'Critical (-25 pts)',
}

// Error Type Points Mapping
export const ErrorTypePoints: Record<number, number> = {
  1: 5,
  2: 15,
  3: 25,
}

// Issues Related To Enum (field IDs)
export const IssuesRelatedToEnum = {
  'p9m9-1': 1, // Session Duration
  '1hye-1': 2, // Mental Status
  '6tx9-1': 3, // Subjective
  'rb2f-1': 4, // Objective
  'zad8-1': 5, // Assessment & Therapeutic Intervention
  'ugq6-1': 6, // Reaction to Intervention
  'hnfi-1': 7, // Plan and Collaboration
  '9z5t-1': 8, // Therapist Reflection and Insight
  'gm4p-1': 9, // Progress
  'kxgx-7': 10, // Suicidality
  'kxgx-8': 11, // Homicidality
  '4lbp-1': 12, // Therapist Initials
  'general': 13, // General
}

// Issues Related To Display Names
export const IssuesRelatedToDisplayNames: Record<number, string> = {
  1: 'Session Duration',
  2: 'Mental Status',
  3: 'Subjective',
  4: 'Objective',
  5: 'Assessment & Therapeutic Intervention',
  6: 'Reaction to Intervention',
  7: 'Plan and Collaboration',
  8: 'Therapist Reflection and Insight',
  9: 'Progress',
  10: 'Suicidality',
  11: 'Homicidality',
  12: 'Therapist Initials',
  13: 'General',
}

// Reverse mapping: ID to key
export const IssuesRelatedToIdToKey: Record<number, string> = {
  1: 'p9m9-1',
  2: '1hye-1',
  3: '6tx9-1',
  4: 'rb2f-1',
  5: 'zad8-1',
  6: 'ugq6-1',
  7: 'hnfi-1',
  8: '9z5t-1',
  9: 'gm4p-1',
  10: 'kxgx-7',
  11: 'kxgx-8',
  12: '4lbp-1',
  13: 'general',
}

// Issue Description Enum
export const IssueDescriptionEnum = {
  no_clinical_interpretation: 1,
  no_modality_intervention_explanation: 2,
  vague_non_specific_language: 3,
  templated_boilerplate_language: 4,
  repetitive_content_within_note: 5,
  not_specific_to_date_of_service: 6,
  progress_marked_not_supported: 7,
  transcription_style_documentation: 8,
  missing_required_field: 9,
  identical_duplicate_content_previous_note: 10,
  one_field_copied_previous_note: 11,
  repetitive_field_multiple_notes: 12,
  plan_generic_continuity_only: 13,
}

// Issue Description Display Names
export const IssueDescriptionDisplayNames: Record<number, string> = {
  1: 'No clinical interpretation',
  2: 'No modality or intervention explanation',
  3: 'Vague or non-specific language',
  4: 'Templated or boilerplate language',
  5: 'Repetitive content within the note',
  6: 'Not specific to date of service',
  7: 'Progress marked but not supported by note content',
  8: 'Transcription-style documentation',
  9: 'Missing required field',
  10: 'Identical or duplicate content from previous note',
  11: 'One field copied from previous note',
  12: 'Repetitive field across multiple notes',
  13: 'Plan is generic or continuity-only',
}
