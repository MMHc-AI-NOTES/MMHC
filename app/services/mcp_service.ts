import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import { EvaluationPromptKeys } from '#enums/evaluation_prompt_enum'
import { EvaluationThresholdEnum } from '#enums/evaluation_enum'
import { mcpConfig } from '#config/services'
import logger from '@adonisjs/core/services/logger'
import { ErrorTypeEnum, ErrorTypePoints } from '#enums/manual_issue_enum'
import { SessionTypeEnum } from '#enums/session_enum'
import axios from 'axios'

// ─── Types (MMHC AI Scorer Mock API v13 — POST /score-note) ─────────────────

import {
  Session,
  McpScoreNoteRequest,
  McpAiIssue,
  McpScoreNoteResponse,
  NormalizedEvaluationIssue,
  NormalizedEvaluationResult,
} from '#interfaces/mcp_interface'

export type {
  Session,
  McpScoreNoteRequest,
  McpAiIssue,
  McpScoreNoteResponse,
  NormalizedEvaluationIssue,
  NormalizedEvaluationResult,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SESSION_FIELD_KEYS: (keyof Session)[] = [
  'Subjective',
  'Objective',
  'Assessment & Therapeutic Intervention',
  'Reaction to Intervention',
  'Plan and Collaboration',
  'Session Duration',
  'Mental Status (optional)',
  'Suicidality',
  'Homicidality',
  'Therapist Reflection and Insight (optional)',
  'Overall',
  'Therapist Initials',
]

const roundToNearestFive = (num: number): number => Math.round(num / 5) * 5

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
      query.whereIn('description_id', uniqueTexts).orWhereHas('issueDescription', (issueQuery) => {
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

export type ResolvedTemplate = {
  meta: TemplateMetadata
  // 'id' = matched on the scorer's description_id, safe to trust the template's
  // section fields. 'text' = matched on description text only, which is shared
  // across sections, so the template's section fields must not override the issue's.
  matchedBy: 'id' | 'text'
}

function resolveTemplateMetadata(
  issue: McpAiIssue,
  lookups: {
    byDescriptionId: Map<string, TemplateMetadata>
    byDescriptionText: Map<string, TemplateMetadata>
    byNormalizedDescriptionText: Map<string, TemplateMetadata>
  }
): ResolvedTemplate | undefined {
  const descriptionId = issue.description_id?.trim()
  if (descriptionId) {
    const byId =
      lookups.byDescriptionId.get(descriptionId) ??
      lookups.byDescriptionId.get(normalizeLookupKey(descriptionId))
    if (byId) return { meta: byId, matchedBy: 'id' }
  }

  const description = issue.description?.trim() ?? ''
  if (!description) return undefined

  const byIdViaDescription =
    lookups.byDescriptionId.get(description) ??
    lookups.byDescriptionId.get(normalizeLookupKey(description))
  if (byIdViaDescription) return { meta: byIdViaDescription, matchedBy: 'id' }

  const byText =
    lookups.byDescriptionText.get(description) ??
    lookups.byNormalizedDescriptionText.get(normalizeLookupKey(description))
  if (byText) return { meta: byText, matchedBy: 'text' }

  return undefined
}

// Builds the stored issue from the scorer issue + matched template.
//
// Rule: what the finding IS comes from the scorer (label, section, id).
// The template only supplies how much it COSTS (points and severity).
// A wrong template row can then only affect the score, which a reviewer
// can see and challenge, instead of relabelling the finding as a
// different kind of problem. On a text match the template's section is
// dropped too, since the same text is reused across sections.
export function mergeIssueWithTemplate(
  issue: McpAiIssue,
  resolved: ResolvedTemplate
): NormalizedEvaluationIssue {
  const { meta, matchedBy } = resolved
  const matchedById = matchedBy === 'id'

  // Severity is the scorer's judgement, so its error_type wins. The template
  // is only a fallback for findings that arrive without one. Previously the
  // template took priority, which let a mismapped row show a finding the
  // scorer graded moderate as critical.
  const scorerSeverity = issue.error_type?.trim() ? mapErrorTypeToSeverity(issue.error_type) : null
  const severityName = scorerSeverity ?? meta.severity ?? ''

  // Points follow from the severity we just settled on. Fall back to the
  // template's own points, then to confidence, when severity is unknown.
  const severityKey = severityName.toLowerCase() as keyof typeof ErrorTypeEnum
  const pointsForSeverity = ErrorTypePoints[ErrorTypeEnum[severityKey]]

  let pointsDeducted =
    typeof pointsForSeverity === 'number'
      ? pointsForSeverity
      : typeof meta.points === 'number'
        ? Math.abs(meta.points)
        : typeof issue.confidence === 'number'
          ? roundToNearestFive(Math.round(issue.confidence * 30))
          : 0
  pointsDeducted = roundToNearestFive(pointsDeducted)

  const severity = deriveSeverity(severityName, pointsDeducted)

  // A template grading that disagrees with the scorer usually means the mapping
  // row is wrong. Surface it rather than letting it change the reviewer's view.
  if (scorerSeverity && meta.severity && scorerSeverity !== meta.severity.toLowerCase()) {
    logger.warn('[MCP] Template severity does not match the scorer grading', {
      descriptionId: issue.description_id ?? null,
      scorerSeverity,
      templateSeverity: meta.severity,
      matchedBy,
    })
  }

  // Scorer's own label wins; the template text is only a fallback for
  // findings that arrive without one.
  const scorerLabel = issue.description?.trim() || null
  const label = scorerLabel ?? meta.description ?? null

  // A template whose text disagrees with the scorer usually means the
  // mapping row points at the wrong description - surface it rather than
  // letting it quietly change what the reviewer reads.
  if (
    scorerLabel &&
    meta.description &&
    normalizeLookupKey(scorerLabel) !== normalizeLookupKey(meta.description)
  ) {
    logger.warn('[MCP] Template description does not match the scorer label', {
      descriptionId: issue.description_id ?? null,
      scorerLabel,
      templateLabel: meta.description,
      matchedBy,
    })
  }

  return {
    severity,
    description_id: matchedById
      ? (meta.descriptionId ?? issue.description_id ?? null)
      : (issue.description_id ?? null),
    description: label,
    severity_details: label ?? '',
    template_matched: true,
    points_deducted: pointsDeducted,
    section_id: matchedById ? (meta.sectionId ?? null) : null,
    section: matchedById ? (meta.section ?? issue.section ?? '') : (issue.section ?? ''),
    justification: issue.justification || 'empty',
    confidence: issue.confidence ?? null,
    error_type: issue.error_type ?? null,
    evidence: issue.evidence || 'empty',
    detector_tier: issue.detector_tier ?? null,
  }
}

function deriveSeverity(severity: string, pointsDeducted: number): keyof typeof ErrorTypeEnum {
  if (severity) {
    return severity.toLowerCase() as keyof typeof ErrorTypeEnum
  }

  if (pointsDeducted >= ErrorTypePoints[ErrorTypeEnum.critical]) {
    return 'critical'
  }

  if (pointsDeducted >= ErrorTypePoints[ErrorTypeEnum.moderate]) {
    return 'moderate'
  }

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
 * Maps stored webhook field names to the MCP Session interface.
 */
/**
 * Session object sent to the scorer. Progress notes keep the fixed twelve
 * sections, blanks included, since the scorer depends on that shape. Other
 * types send their own sections; forcing them through the twelve sent the
 * scorer an empty note.
 */
export function parseSessionForMcp(sessionContent: unknown, sessionType?: number | null): Session {
  const parsed = parseNoteToSessionObject(sessionContent)

  // Opt in by known type so an unexpected value keeps the old behaviour.
  const typesWithOwnSections: number[] = [
    SessionTypeEnum.intake,
    SessionTypeEnum.treatment_plan,
    SessionTypeEnum.termination,
  ]
  const useProgressNoteShape =
    sessionType === null || sessionType === undefined || !typesWithOwnSections.includes(sessionType)

  if (useProgressNoteShape) {
    return SESSION_FIELD_KEYS.reduce((session, key) => {
      session[key] = String(parsed[key] ?? '').trim()
      return session
    }, {} as Session)
  }

  return Object.entries(parsed).reduce((session, [key, value]) => {
    const text = String(value ?? '').trim()
    if (key.trim() && text) session[key] = text
    return session
  }, {} as Session)
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

/** CPT code string from preloaded session.cptCode relation. */
export function resolveMcpCptCode(session: { cptCode?: { code?: string | null } | null }): string {
  return session.cptCode?.code?.trim() ?? ''
}

/** Build the MCP POST /score-note request body. */
export function buildMcpScoreNoteRequest(params: {
  noteId: string
  clientId: string
  cptCode: string
  diagnosis: Record<string, any>[]
  currentNote: string
  previousNote?: string
  sessionType?: number | null
}): McpScoreNoteRequest {
  const currentSession = parseSessionForMcp(params.currentNote, params.sessionType)
  const previousSession = params.previousNote
    ? parseSessionForMcp(params.previousNote, params.sessionType)
    : null

  return {
    note_id: params.noteId,
    client_id: params.clientId,
    cpt_code: params.cptCode,
    diagnosis: params.diagnosis,
    current_session: currentSession,
    previous_session: previousSession,
  }
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
 * Build a human-readable user_input string (same style as Bedrock path)
 * so logs/audits are comparable.
 */
function buildUserInput(currentNote: Session, previousNote: Session | null): string {
  const currentText = JSON.stringify(currentNote)
  const previousText = JSON.stringify(previousNote)

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
    const resolved = resolveTemplateMetadata(issue, lookups)

    // No template match at all: dropped, same as before this change.
    if (!resolved) {
      return acc
    }

    acc.push(mergeIssueWithTemplate(issue, resolved))
    return acc
  }, [])

  let score = 100
  if (issues.length > 0) {
    const totalDeduction = issues.reduce(
      (sum, item) => sum + Math.abs(item.points_deducted ?? 0),
      0
    )
    score = Math.max(0, 100 - totalDeduction)
  }
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
  cptCode: string
  diagnosis: Record<string, any>[]
  currentNote: string
  previousNote: string | undefined
  sessionType?: number | null
}): Promise<NormalizedEvaluationResult> {
  const baseUrl = mcpConfig.apiUrl
  const token = mcpConfig.token

  if (!baseUrl) throw new Error('MCP_API_URL is not configured')

  const requestBody = buildMcpScoreNoteRequest({
    noteId: params.noteId,
    clientId: params.clientId,
    cptCode: params.cptCode,
    diagnosis: params.diagnosis,
    currentNote: params.currentNote,
    previousNote: params.previousNote,
    sessionType: params.sessionType,
  })

  const userInput = buildUserInput(
    requestBody.current_session,
    requestBody.previous_session ?? null
  )
  logger.info({ requestBody }, 'requestBody')
  let mcpResponse: McpScoreNoteResponse
  let rawResponse: string

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const authHeader = buildMcpAuthHeader(token)
    if (authHeader) headers['authorization'] = authHeader

    const res = await axios.post(`${baseUrl.replace(/\/$/, '')}/score-note`, requestBody, {
      headers,
      responseType: 'text',
    })

    rawResponse = res.data

    logger.info({ rawResponse }, 'rawResponse')
    mcpResponse = JSON.parse(rawResponse) as McpScoreNoteResponse
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status
      const rawErrResponse =
        typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data)
      logger.error({ rawResponse: rawErrResponse }, 'MCP API returned HTTP error response')
      throw new Error(`MCP API returned HTTP ${status}: ${rawErrResponse}`)
    }
    logger.error({ error }, 'MCP API call failed')
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
      mcp_request: requestBody,
      validation_result: {
        isValid: false,
        status: 'error',
        message: error.message ?? 'MCP API call failed',
      },
    }
  }

  // ── Sanitise issues ────────────────────────────────────────────────────────
  if (Array.isArray(mcpResponse.ai_issues)) {
    for (const issue of mcpResponse.ai_issues) {
      if (typeof issue.evidence === 'string') {
        const trimmed = issue.evidence.trim()
        if (trimmed === "''" || trimmed === '""' || trimmed === '') {
          issue.evidence = 'empty'
        }
      } else if (!issue.evidence) {
        issue.evidence = 'empty'
      }
      if (typeof issue.justification === 'string') {
        const trimmed = issue.justification.trim()
        if (trimmed === "''" || trimmed === '""' || trimmed === '') {
          issue.justification = 'empty'
        } else {
          const cleaned = trimmed
            .replace(/\s*[—–-]\s*['"]{2}$/, '')
            .replace(/['"]{2}/g, '')
            .trim()
          issue.justification = cleaned === '' ? 'empty' : cleaned
        }
      } else if (!issue.justification) {
        issue.justification = 'empty'
      }
    }
  }

  // ── Normalise ──────────────────────────────────────────────────────────────
  const issueValidation = validateMcpIssues(mcpResponse.ai_issues ?? [])
  const { issues, score: derivedScore } = await normaliseMcpIssues(mcpResponse.ai_issues ?? [])

  // Prefer MCP API score; fall back to issue-based calculation
  const finalScore = Math.max(0, Math.min(100, mcpResponse.score ?? derivedScore))
  const passed = finalScore >= EvaluationThresholdEnum.passThreshold
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
    'mcp_request': requestBody,
  }
}

/** Return only the raw MCP /score-note payload for API responses. */
export function toMcpApiResponse(evaluation: NormalizedEvaluationResult): McpScoreNoteResponse {
  const response = toMcpApiResponseOrNull(evaluation)
  if (response) {
    return response
  }

  throw new Error(evaluation.validation_result?.message ?? 'MCP API returned no response')
}

/** Same as toMcpApiResponse but returns null when MCP payload is unavailable. */
export function toMcpApiResponseOrNull(
  evaluation: NormalizedEvaluationResult | null | undefined
): McpScoreNoteResponse | null {
  if (!evaluation) {
    return null
  }

  if (evaluation.mcp_response) {
    return evaluation.mcp_response
  }

  if (evaluation.raw_response?.trim()) {
    try {
      return JSON.parse(evaluation.raw_response) as McpScoreNoteResponse
    } catch {
      logger.error({ evaluation }, 'MCP API returned no response')
    }
  }

  return null
}
