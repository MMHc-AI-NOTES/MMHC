export interface Session {
  'Subjective': string
  'Objective': string
  'Assessment & Therapeutic Intervention': string
  'Reaction to Intervention': string
  'Plan and Collaboration': string
  'Session Duration': string
  'Mental Status (optional)': string
  'Suicidality': string
  'Homicidality': string
  'Therapist Reflection and Insight (optional)': string
  'Overall': string
  'Therapist Initials': string
}

/** Request body for POST /score-note */
export interface McpScoreNoteRequest {
  note_id: string
  client_id: string
  cpt_code: string
  diagnosis: Record<string, any>[]
  current_session: Session
  previous_session?: Session | null
}

export interface McpAiIssue {
  section: string
  description: string
  description_id?: string | null
  error_type: string
  confidence: number
  evidence: string
  justification: string
  detector_tier: string
}

/** Response body from POST /score-note */
export interface McpScoreNoteResponse {
  note_id: string
  model_version: string
  scored_at: string
  verdict: string
  score: number
  latency_ms: number
  ai_issues: McpAiIssue[]
  meta: Record<string, unknown>
}

/** Shared normalized issue shape (matches Bedrock output). */
export type NormalizedEvaluationIssue = {
  severity: string
  description_id?: string | null
  description?: string | null
  severity_details?: string
  template_matched?: boolean
  points_deducted: number
  section_id?: string | null
  section: string
  justification: string
  confidence?: number | null
  error_type?: string | null
  evidence?: string | null
  detector_tier?: string | null
}

/** Shared evaluation result shape (matches Bedrock output) */
export interface NormalizedEvaluationResult {
  'score': number
  'pass': boolean
  'issues': NormalizedEvaluationIssue[]
  'summary': string | null
  'sentiment': string | null
  'evaluation': string | null
  '6tx9-1_subjective'?: string | null
  'rb2f-1_objective'?: string | null
  'zad8-1_asment_&_therapeutic_intervention'?: string | null
  'ugq6-1_reaction_to_intervention'?: string | null
  'hnfi-1_plan_and_collaboration'?: string | null
  '9z5t-1_therapist_reflection'?: string | null
  'gm4p-1_progress'?: string | null
  'kxgx-7_&_kxgx-8_suicidality/homicidality'?: string | null
  'raw_response': string
  'user_input': string
  'validation_result'?: {
    isValid: boolean
    status: 'pass' | 'fail' | 'error'
    message: string
  }
  /** Full MCP /score-note response when AI_REVIEW=MCP */
  'mcp_response'?: McpScoreNoteResponse
}
