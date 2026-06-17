import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import { EvaluationPromptKeys } from '#enums/evaluation_prompt_enum'
import env from '#start/env'

// ─── Types (MMHC AI Scorer Mock API v13 — POST /score-note) ─────────────────

/** Request body for POST /score-note */
export interface McpScoreNoteRequest {
  note_id: string
  client_id: string
  current_session: Record<string, unknown>
  previous_session: Record<string, unknown>
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const roundToNearestFive = (num: number): number => Math.round(num / 5) * 5

const PASS_THRESHOLD = 75

type TemplateMetadata = {
  descriptionId: string | null
  description: string | null
  severity: string | null
  points: number | null
  sectionId: string | null
  section: string | null
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase()
}

function toTemplateMetadata(template: SmeIssuesTamplate): TemplateMetadata {
  return {
    descriptionId: template.descriptionId ?? null,
    description: template.issueDescription?.description ?? null,
    severity: template.errorType?.name ?? null,
    points: template.errorType?.points ?? null,
    sectionId: template.issuesRelatedTo?.fieldId ?? null,
    section: template.issuesRelatedTo?.displayName ?? null,
  }
}

function validateMcpIssues(aiIssues: McpAiIssue[]): {
  isValid: boolean
  status: 'pass' | 'fail' | 'error'
  message: string
} {
  if (!Array.isArray(aiIssues)) {
    return {
      isValid: false,
      status: 'error',
      message: 'MCP response ai_issues must be an array',
    }
  }

  const requiredIssueFields = ['description', 'justification'] as const
  const issuesWithMissingFields: number[] = []

  aiIssues.forEach((issue, index) => {
    const missingFields = requiredIssueFields.filter((field) => {
      const value = issue[field]
      return value === undefined || value === null || String(value).trim() === ''
    })

    if (missingFields.length > 0) {
      issuesWithMissingFields.push(index)
    }
  })

  if (issuesWithMissingFields.length > 0) {
    return {
      isValid: false,
      status: 'error',
      message: `MCP ai_issues at indices [${issuesWithMissingFields.join(', ')}] are missing required subfields (description, justification)`,
    }
  }

  return {
    isValid: true,
    status: 'pass',
    message: 'All required MCP issue fields are present',
  }
}

async function loadTemplateLookups(issueTexts: string[]): Promise<{
  byDescriptionId: Map<string, TemplateMetadata>
  byDescriptionText: Map<string, TemplateMetadata>
  byNormalizedDescriptionText: Map<string, TemplateMetadata>
}> {
  const uniqueTexts = [...new Set(issueTexts.map((value) => value.trim()).filter(Boolean))]

  const byDescriptionId = new Map<string, TemplateMetadata>()
  const byDescriptionText = new Map<string, TemplateMetadata>()
  const byNormalizedDescriptionText = new Map<string, TemplateMetadata>()

  if (!uniqueTexts.length) {
    return { byDescriptionId, byDescriptionText, byNormalizedDescriptionText }
  }

  const templates = await SmeIssuesTamplate.query()
    .where((query) => {
      query
        .whereIn('description_id', uniqueTexts)
        .orWhereHas('issueDescription', (issueQuery) => {
          issueQuery.whereIn('description', uniqueTexts)
        })
    })
    .preload('issueDescription')
    .preload('errorType')
    .preload('issuesRelatedTo')

  templates.forEach((template) => {
    const metadata = toTemplateMetadata(template)

    if (template.descriptionId) {
      byDescriptionId.set(template.descriptionId, metadata)
      byDescriptionId.set(normalizeLookupKey(template.descriptionId), metadata)
    }

    const description = template.issueDescription?.description
    if (description) {
      byDescriptionText.set(description, metadata)
      byNormalizedDescriptionText.set(normalizeLookupKey(description), metadata)
    }
  })

  return { byDescriptionId, byDescriptionText, byNormalizedDescriptionText }
}

function resolveTemplateMetadata(
  issue: McpAiIssue,
  lookups: {
    byDescriptionId: Map<string, TemplateMetadata>
    byDescriptionText: Map<string, TemplateMetadata>
    byNormalizedDescriptionText: Map<string, TemplateMetadata>
  }
): TemplateMetadata | undefined {
  const descriptionId = issue.description_id?.trim()
  if (descriptionId) {
    const byId =
      lookups.byDescriptionId.get(descriptionId) ??
      lookups.byDescriptionId.get(normalizeLookupKey(descriptionId))
    if (byId) return byId
  }

  const description = issue.description?.trim() ?? ''
  if (!description) return undefined

  return (
    lookups.byDescriptionId.get(description) ??
    lookups.byDescriptionId.get(normalizeLookupKey(description)) ??
    lookups.byDescriptionText.get(description) ??
    lookups.byNormalizedDescriptionText.get(normalizeLookupKey(description))
  )
}

function deriveSeverity(severity: string | null | undefined, pointsDeducted: number): string {
  if (severity) {
    return severity.toLowerCase()
  }

  if (pointsDeducted >= 25) return 'critical'
  if (pointsDeducted >= 15) return 'moderate'
  return 'minor'
}

/** Mock MCP expects `Authorization: Bearer <token>`. */
function buildMcpAuthHeader(token: string | undefined): string | undefined {
  const trimmed = token?.trim()
  if (!trimmed) return undefined
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed : `Bearer ${trimmed}`
}

/**
 * Parse note content into the object shape MCP expects for current_session / previous_session.
 * Session rows store JSON from webhook FIELD_MAPPING, e.g. {"Subjective":"...","Objective":"..."}.
 */
export function parseNoteToSessionObject(note: unknown): Record<string, unknown> {
  if (note === null || note === undefined) return {}

  if (typeof note === 'string') {
    const trimmed = note.trim()
    if (!trimmed) return {}

    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // Not JSON — fall through to plain text wrapper
    }

    return { text: note }
  }

  if (typeof note === 'object' && !Array.isArray(note)) {
    return note as Record<string, unknown>
  }

  return { text: String(note) }
}

/**
 * Build MCP current_session / previous_session from DB session JSON.
 * Keeps only non-empty clinical fields (same keys as IntakeQ webhook storage).
 */
export function parseSessionForMcp(sessionContent: unknown): Record<string, string> {
  const parsed = parseNoteToSessionObject(sessionContent)

  if ('text' in parsed && Object.keys(parsed).length === 1) {
    return {}
  }

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    const strVal = String(value ?? '').trim()
    if (strVal) result[key] = strVal
  }
  return result
}

/** MCP client_id = PracticeQ patient client_id from DB, not internal session id. */
export function resolveMcpClientId(session: {
  patient?: { clientId?: string | null } | null
  patientId?: number | null
  id?: number
}): string {
  if (session.patient?.clientId?.trim()) return session.patient.clientId.trim()
  if (session.patientId) return String(session.patientId)
  return String(session.id ?? '')
}

/**
 * Map MCP error_type string → severity bucket when DB template has no severity.
 */
function mapErrorTypeToSeverity(errorType: string): string {
  const lower = errorType.toLowerCase()
  if (lower.includes('critical') || lower.includes('major')) return 'critical'
  if (lower.includes('moderate') || lower.includes('medium')) return 'moderate'
  return 'minor'
}

/**
 * Convert a plain note value (object or string) into the same flat-text
 * format used by the Bedrock path so prompts look identical.
 */
function noteToPlainText(note: unknown): string {
  if (!note) return ''

  // Already a string
  if (typeof note === 'string') {
    try {
      const parsed = JSON.parse(note)
      return noteToPlainText(parsed)
    } catch {
      return note
    }
  }

  if (typeof note === 'object' && !Array.isArray(note)) {
    return Object.entries(note as Record<string, unknown>)
      .filter(([key, value]) => {
        const strVal = String(value ?? '').trim()
        return strVal !== '' || key.toLowerCase().includes('optional')
      })
      .map(([key, value]) => {
        const strVal = String(value ?? '').trim()
        return strVal ? `${key}: ${strVal}` : `${key}:   `
      })
      .join('  \n\n')
  }

  return String(note)
}

/**
 * Build a human-readable user_input string (same style as Bedrock path)
 * so logs/audits are comparable.
 */
function buildUserInput(currentNote: unknown, previousNote: unknown): string {
  const currentText = noteToPlainText(currentNote)
  const previousText = noteToPlainText(previousNote)

  let prompt = `${EvaluationPromptKeys.currentSession}:\n${currentText}\n\n`
  prompt += `${EvaluationPromptKeys.previousSessions}:\n`
  prompt += previousText || 'No previous sessions available for this patient'
  return prompt
}

/**
 * Look up SME template metadata for each MCP issue, matching by description_id
 * or issue description text against DB templates — same rules as Bedrock path.
 * Issues with no DB match are excluded.
 */
async function normaliseMcpIssues(aiIssues: McpAiIssue[]): Promise<{
  issues: NormalizedEvaluationIssue[]
  score: number
}> {
  if (!aiIssues.length) return { issues: [], score: 100 }

  const lookupTexts = aiIssues.flatMap((issue) => {
    const values: string[] = []
    if (issue.description_id?.trim()) values.push(issue.description_id.trim())
    if (issue.description?.trim()) values.push(issue.description.trim())
    return values
  })

  const lookups = await loadTemplateLookups(lookupTexts)

  const issues = aiIssues.reduce<NormalizedEvaluationIssue[]>((acc, issue) => {
    const templateMeta = resolveTemplateMetadata(issue, lookups)
    const templateMatched = Boolean(templateMeta)

    if (!templateMatched) {
      return acc
    }

    let pointsDeducted =
      typeof templateMeta?.points === 'number'
        ? Math.abs(templateMeta.points)
        : typeof issue.confidence === 'number'
          ? roundToNearestFive(Math.round(issue.confidence * 30))
          : 0

    pointsDeducted = roundToNearestFive(pointsDeducted)

    const severity = deriveSeverity(
      templateMeta?.severity ?? mapErrorTypeToSeverity(issue.error_type ?? ''),
      pointsDeducted
    )
    const dbDescription = templateMeta?.description ?? null

    acc.push({
      severity,
      description_id: templateMeta?.descriptionId ?? issue.description_id ?? null,
      description: dbDescription,
      severity_details: dbDescription ?? '',
      template_matched: templateMatched,
      points_deducted: pointsDeducted,
      section_id: templateMeta?.sectionId ?? null,
      section: templateMeta?.section ?? issue.section ?? '',
      justification: issue.justification || '',
      confidence: issue.confidence ?? null,
      error_type: issue.error_type ?? null,
      evidence: issue.evidence ?? null,
      detector_tier: issue.detector_tier ?? null,
    })

    return acc
  }, [])

  let score = 100
  if (issues.length > 0) {
    const totalDeduction = issues.reduce((sum, item) => sum + Math.abs(item.points_deducted ?? 0), 0)
    score = Math.max(0, 100 - totalDeduction)
  }
  // console.log('issues', issues)
  // console.log('score', score)
  return { issues, score }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Call the MCP /score-note API and return a result in exactly the same shape
 * as `evaluateChatWithBedrock` so callers need no branching logic.
 */
export async function evaluateChatWithMcp(params: {
  noteId: string
  clientId: string
  currentNote: unknown
  previousNote?: unknown
}): Promise<NormalizedEvaluationResult> {
  const baseUrl = env.get('MCP_API_URL')
  const token = env.get('MCP_TOKEN')

  if (!baseUrl) throw new Error('MCP_API_URL is not configured')

  const currentSession = parseSessionForMcp(params.currentNote)
  const previousSession = parseSessionForMcp(params.previousNote)

  const requestBody: McpScoreNoteRequest = {
    note_id: params.noteId,
    client_id: params.clientId,
    current_session: currentSession,
    previous_session: previousSession,
  }

  const userInput = buildUserInput(currentSession, previousSession)

  // console.log('[MCP] POST /score-note', JSON.stringify(requestBody, null, 2))

  // ── HTTP call ──────────────────────────────────────────────────────────────
  let mcpResponse: McpScoreNoteResponse
  let rawResponse: string

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const authHeader = buildMcpAuthHeader(token)
    if (authHeader) headers['authorization'] = authHeader

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/score-note`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    rawResponse = await res.text()

    if (!res.ok) {
      // console.error('MCP API error response:', rawResponse)
      throw new Error(`MCP API returned HTTP ${res.status}: ${rawResponse}`)
    }
    // console.log('rawResponse', rawResponse)
    mcpResponse = JSON.parse(rawResponse) as McpScoreNoteResponse
  } catch (error: any) {
    console.error('MCP API call failed:', error.message)
    // Return a safe fallback – same pattern as Bedrock error path
    return {
      score: 100,
      pass: true,
      issues: [],
      summary: null,
      sentiment: null,
      evaluation: null,
      raw_response: '',
      user_input: userInput,
      validation_result: {
        isValid: false,
        status: 'error',
        message: error.message ?? 'MCP API call failed',
      },
    }
  }

  // ── Normalise ──────────────────────────────────────────────────────────────
  const issueValidation = validateMcpIssues(mcpResponse.ai_issues ?? [])
  const { issues, score: derivedScore } = await normaliseMcpIssues(mcpResponse.ai_issues ?? [])

  // Prefer MCP API score; fall back to issue-based calculation
  const finalScore = Math.max(0, Math.min(100, mcpResponse.score ?? derivedScore))
  const passed = finalScore >= PASS_THRESHOLD
  const validationStatus: 'pass' | 'fail' | 'error' = issueValidation.isValid
    ? passed
      ? 'pass'
      : 'fail'
    : 'error'

  return {
    'score': finalScore,
    'pass': passed,
    issues,
    'summary': mcpResponse.verdict ?? null,
    'sentiment': null,
    'evaluation': null,
    '6tx9-1_subjective': null,
    'rb2f-1_objective': null,
    'zad8-1_asment_&_therapeutic_intervention': null,
    'ugq6-1_reaction_to_intervention': null,
    'hnfi-1_plan_and_collaboration': null,
    '9z5t-1_therapist_reflection': null,
    'gm4p-1_progress': null,
    'kxgx-7_&_kxgx-8_suicidality/homicidality': null,
    'raw_response': rawResponse,
    'user_input': userInput,
    'validation_result': {
      isValid: issueValidation.isValid && passed,
      status: validationStatus,
      message: issueValidation.isValid
        ? `MCP ${validationStatus} — score ${finalScore} (model: ${mcpResponse.model_version}, latency: ${mcpResponse.latency_ms}ms, verdict: ${mcpResponse.verdict})`
        : issueValidation.message,
    },
    'mcp_response': mcpResponse,
  }
}

/** Return only the raw MCP /score-note payload for API responses. */
export function toMcpApiResponse(evaluation: NormalizedEvaluationResult): McpScoreNoteResponse {
  if (evaluation.mcp_response) {
    return evaluation.mcp_response
  }

  if (evaluation.raw_response?.trim()) {
    try {
      return JSON.parse(evaluation.raw_response) as McpScoreNoteResponse
    } catch {
      // fall through
    }
  }

  throw new Error(evaluation.validation_result?.message ?? 'MCP API returned no response')
}


