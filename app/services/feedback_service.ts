import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import IssuesRelatedTo from '#models/issues_related_to'
import FeedbackVerdict from '#models/feedback_verdict'
import Session from '#models/session'
import axios from 'axios'
import { mcpConfig } from '#config/services'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import type { SubmitFeedbackPayload } from '#validators/feedback_validator'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export interface AdjudicationVerdict {
  section: string
  description_id: string
  description: string
  code: string
  side: string
  verdict: string
  comment: string
  by: string
}

export interface AdjudicationRequest {
  note_id: string
  scorer_version: string
  reviewer: string
  reviewed_at: string
  verdicts: AdjudicationVerdict[]
}

type TemplateMetadata = {
  templateId: number
  issueDescriptionId: number | null
  issuesRelatedToId: number
  descriptionId: string | null
  description: string | null
  section: string | null
}

type ResolvedVerdict = {
  mcp: AdjudicationVerdict
  smeIssueTemplateId: number | null
  issueDescriptionId: number | null
  issuesRelatedToId: number | null
}

function buildMcpAuthHeader(token: string | undefined): string | undefined {
  const trimmed = token?.trim()
  if (!trimmed) return undefined
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed : `Bearer ${trimmed}`
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase()
}

async function loadTemplateLookups(verdicts: SubmitFeedbackPayload['verdicts']): Promise<{
  byDescriptionId: Map<string, TemplateMetadata>
  byDescriptionText: Map<string, TemplateMetadata>
}> {
  const lookupValues = new Set<string>()

  for (const verdict of verdicts) {
    for (const value of [verdict.description_id, verdict.description, verdict.code]) {
      const trimmed = value?.trim()
      if (trimmed) lookupValues.add(trimmed)
    }
  }

  const byDescriptionId = new Map<string, TemplateMetadata>()
  const byDescriptionText = new Map<string, TemplateMetadata>()

  if (!lookupValues.size) {
    return { byDescriptionId, byDescriptionText }
  }

  const values = [...lookupValues]
  const templates = await SmeIssuesTamplate.query()
    .where((query) => {
      query
        .whereIn('description_id', values)
        .orWhereHas('issueDescription', (issueQuery) => {
          issueQuery.whereIn('description', values)
        })
    })
    .preload('issueDescription')
    .preload('issuesRelatedTo')

  templates.forEach((template) => {
    const metadata: TemplateMetadata = {
      templateId: template.id,
      issueDescriptionId: template.issueDescriptionId ?? null,
      issuesRelatedToId: template.issuesRelatedToId,
      descriptionId: template.descriptionId ?? null,
      description: template.issueDescription?.description ?? null,
      section: template.issuesRelatedTo?.displayName ?? null,
    }

    if (template.descriptionId) {
      byDescriptionId.set(template.descriptionId, metadata)
      byDescriptionId.set(normalizeLookupKey(template.descriptionId), metadata)
    }

    const description = template.issueDescription?.description
    if (description) {
      byDescriptionText.set(description, metadata)
      byDescriptionText.set(normalizeLookupKey(description), metadata)
    }
  })

  return { byDescriptionId, byDescriptionText }
}

async function loadSectionLookups(
  sections: string[]
): Promise<Map<string, IssuesRelatedTo>> {
  const uniqueSections = [...new Set(sections.map((s) => s.trim()).filter(Boolean))]
  const map = new Map<string, IssuesRelatedTo>()

  if (!uniqueSections.length) return map

  const rows = await IssuesRelatedTo.query().where((query) => {
    query.whereIn('display_name', uniqueSections).orWhereIn('field_id', uniqueSections)
  })

  rows.forEach((row) => {
    map.set(row.displayName, row)
    map.set(normalizeLookupKey(row.displayName), row)
    map.set(row.fieldId, row)
    map.set(normalizeLookupKey(row.fieldId), row)
  })

  return map
}

function resolveTemplateMetadata(
  verdict: SubmitFeedbackPayload['verdicts'][number],
  lookups: {
    byDescriptionId: Map<string, TemplateMetadata>
    byDescriptionText: Map<string, TemplateMetadata>
  }
): TemplateMetadata | undefined {
  const candidates = [verdict.description_id, verdict.code, verdict.description]
    .map((value) => value?.trim())
    .filter(Boolean) as string[]

  for (const candidate of candidates) {
    const byId =
      lookups.byDescriptionId.get(candidate) ??
      lookups.byDescriptionId.get(normalizeLookupKey(candidate))
    if (byId) return byId
  }

  const description = verdict.description?.trim()
  if (description) {
    return (
      lookups.byDescriptionText.get(description) ??
      lookups.byDescriptionText.get(normalizeLookupKey(description))
    )
  }

  return undefined
}

async function resolveVerdicts(
  verdicts: SubmitFeedbackPayload['verdicts'],
  reviewerName: string
): Promise<ResolvedVerdict[]> {
  const templateLookups = await loadTemplateLookups(verdicts)
  const sectionLookups = await loadSectionLookups(verdicts.map((v) => v.section ?? ''))

  return verdicts.map((verdict) => {
    const templateMeta = resolveTemplateMetadata(verdict, templateLookups)
    const sectionKey = verdict.section?.trim() ?? ''
    const sectionRow =
      sectionLookups.get(sectionKey) ?? sectionLookups.get(normalizeLookupKey(sectionKey))

    const descriptionId =
      templateMeta?.descriptionId?.trim() ||
      verdict.description_id?.trim() ||
      verdict.code?.trim() ||
      ''

    const description =
      templateMeta?.description?.trim() || verdict.description?.trim() || ''

    const section =
      templateMeta?.section?.trim() || sectionRow?.displayName || sectionKey

    return {
      smeIssueTemplateId: templateMeta?.templateId ?? null,
      issueDescriptionId: templateMeta?.issueDescriptionId ?? null,
      issuesRelatedToId: templateMeta?.issuesRelatedToId ?? sectionRow?.id ?? null,
      mcp: {
        section,
        description_id: descriptionId,
        description,
        code: descriptionId || verdict.code?.trim() || '',
        side: verdict.side.trim(),
        verdict: verdict.verdict.trim(),
        comment: verdict.comment?.trim() ?? '',
        by: verdict.by.trim() || reviewerName,
      },
    }
  })
}

async function saveFeedbackVerdicts(params: {
  sessionId: number
  scorerVersion: string
  reviewedAt: string
  resolvedVerdicts: ResolvedVerdict[]
  adjudicationRequest: SubmitFeedbackPayload
  adjudicationResponse: unknown
  reviewerId: number
}): Promise<FeedbackVerdict[]> {
  const {
    sessionId,
    scorerVersion,
    reviewedAt,
    resolvedVerdicts,
    adjudicationRequest,
    adjudicationResponse,
    reviewerId,
  } = params

  const reviewedAtDt = DateTime.fromISO(reviewedAt)
  const savedVerdicts: FeedbackVerdict[] = []

  for (const resolved of resolvedVerdicts) {
    const { mcp, smeIssueTemplateId, issueDescriptionId, issuesRelatedToId } = resolved

    let recordQuery = FeedbackVerdict.query()
      .where('session_id', sessionId)
      .where('reviewer_id', reviewerId)
      .where('side', mcp.side)

    if (smeIssueTemplateId) {
      recordQuery = recordQuery.where('sme_issue_template_id', smeIssueTemplateId)
    } else {
      recordQuery = recordQuery.whereNull('sme_issue_template_id')
    }

    if (issueDescriptionId) {
      recordQuery = recordQuery.where('issue_description_id', issueDescriptionId)
    } else {
      recordQuery = recordQuery.whereNull('issue_description_id')
    }

    let record = await recordQuery.first()

    const verdictData = {
      sessionId,
      reviewerId,
      smeIssueTemplateId,
      issueDescriptionId,
      issuesRelatedToId,
      scorerVersion: scorerVersion || null,
      reviewedAt: reviewedAtDt.isValid ? reviewedAtDt : DateTime.now(),
      side: mcp.side.slice(0, 10),
      verdict: mcp.verdict.slice(0, 10),
      comment: mcp.comment || null,
      adjudicationRequest,
      adjudicationResponse:
        adjudicationResponse === null || adjudicationResponse === undefined
          ? null
          : typeof adjudicationResponse === 'object'
            ? (adjudicationResponse as object)
            : { raw: String(adjudicationResponse) },
    }

    try {
      if (!record) {
        record = await FeedbackVerdict.create(verdictData)
        console.log('[Feedback] Created verdict record id:', record.id)
      } else {
        await record.merge(verdictData).save()
        console.log('[Feedback] Updated verdict record id:', record.id)
      }

      savedVerdicts.push(record)
    } catch (error: any) {
      console.error('[Feedback] Failed to save verdict to DB:', error.message, verdictData)
      throw error
    }
  }

  return savedVerdicts
}

async function preloadFeedbackVerdict(record: FeedbackVerdict) {
  await record.load('reviewer')
  await record.load('session')
  await record.load('smeIssueTemplate', (templateQuery) => {
    templateQuery.preload('issueDescription').preload('issuesRelatedTo')
  })
  await record.load('issueDescription')
  await record.load('issuesRelatedTo')
  return record
}

function serializeFeedbackVerdict(record: FeedbackVerdict) {
  const template = record.smeIssueTemplate
  const issueDescription = record.issueDescription ?? template?.issueDescription
  const issuesRelatedTo = record.issuesRelatedTo ?? template?.issuesRelatedTo
  const reviewerName = record.reviewer?.fullName ?? null

  return {
    id: record.id,
    note_id: record.session?.noteId ?? null,
    session_id: record.sessionId,
    reviewer_id: record.reviewerId,
    sme_issue_template_id: record.smeIssueTemplateId,
    issue_description_id: record.issueDescriptionId,
    issues_related_to_id: record.issuesRelatedToId,
    scorer_version: record.scorerVersion,
    reviewer_name: reviewerName,
    reviewed_at: record.reviewedAt?.toISO() ?? null,
    section: issuesRelatedTo?.displayName ?? null,
    description_id: template?.descriptionId ?? null,
    description: issueDescription?.description ?? null,
    code: template?.descriptionId ?? null,
    side: record.side,
    verdict: record.verdict,
    comment: record.comment,
    by: reviewerName,
    verdict_by: reviewerName,
    adjudication_request: record.adjudicationRequest,
    adjudication_response: record.adjudicationResponse,
    created_at: record.createdAt?.toISO() ?? null,
    updated_at: record.updatedAt?.toISO() ?? null,
    reviewer: record.reviewer,
    sme_issue_template: template,
    issue_description: issueDescription,
    issues_related_to: issuesRelatedTo,
  }
}

export async function submitFeedback(
  payload: SubmitFeedbackPayload,
  reviewerId: number,
  ctx?: HttpContext
) {
  const note = await Session.query().where('note_id', payload.note_id).first()
  if (!note) {
    return sendError('Note not found for the provided note_id')
  }

  const resolvedVerdicts = await resolveVerdicts(payload.verdicts, payload.reviewer.trim())

  const adjudicationBody: AdjudicationRequest = {
    note_id: payload.note_id.trim(),
    scorer_version: payload.scorer_version?.trim() ?? '',
    reviewer: payload.reviewer.trim(),
    reviewed_at: payload.reviewed_at.trim(),
    verdicts: resolvedVerdicts.map((item) => item.mcp),
  }

  let savedVerdicts = await saveFeedbackVerdicts({
    sessionId: note.id,
    scorerVersion: adjudicationBody.scorer_version,
    reviewedAt: adjudicationBody.reviewed_at,
    resolvedVerdicts,
    adjudicationRequest: payload,
    adjudicationResponse: null,
    reviewerId,
  })

  console.log('[Feedback] Saved to DB:', savedVerdicts.length, 'verdict(s)')

  const baseUrl = mcpConfig.apiUrl?.trim()
  if (!baseUrl) {
    await Promise.all(savedVerdicts.map((record) => preloadFeedbackVerdict(record)))

    return sendSuccess('Feedback saved locally (MCP_API_URL is not configured)', {
      adjudication: null,
      request: adjudicationBody,
      verdicts: savedVerdicts.map(serializeFeedbackVerdict),
      mcp_synced: false,
    })
  }

  console.log('[Feedback] POST /adjudications request:', JSON.stringify(adjudicationBody, null, 2))

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const authHeader = buildMcpAuthHeader(mcpConfig.token)
  if (authHeader) headers['authorization'] = authHeader

  let parsedResponse: unknown = null
  let mcpSynced = false
  let mcpStatus = 0

  try {
    const res = await axios.post(
      `${baseUrl.replace(/\/$/, '')}/adjudications`,
      adjudicationBody,
      {
        headers,
        validateStatus: () => true,
      }
    )

    mcpStatus = res.status
    parsedResponse = res.data

    if (typeof parsedResponse === 'string') {
      try {
        parsedResponse = parsedResponse ? JSON.parse(parsedResponse) : null
      } catch {
        // keep raw string when response is not JSON
      }
    }

    console.log('[Feedback] POST /adjudications response status:', res.status)
    console.log('[Feedback] POST /adjudications response body:', parsedResponse)

    mcpSynced = res.status >= 200 && res.status < 300
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      mcpStatus = error.response.status
      parsedResponse = error.response.data
      console.log('[Feedback] POST /adjudications response status:', error.response.status)
      console.log('[Feedback] POST /adjudications response body:', parsedResponse)
    } else {
      console.error('[Feedback] MCP adjudications call failed:', error.message)
      parsedResponse = { error: error.message ?? 'MCP API call failed' }
    }
  }

  const adjudicationResponse = mcpSynced
    ? parsedResponse
    : {
        error: mcpStatus ? `Adjudications API returned HTTP ${mcpStatus}` : 'MCP API call failed',
        body: parsedResponse,
      }

  savedVerdicts = await saveFeedbackVerdicts({
    sessionId: note.id,
    scorerVersion: adjudicationBody.scorer_version,
    reviewedAt: adjudicationBody.reviewed_at,
    resolvedVerdicts,
    adjudicationRequest: payload,
    adjudicationResponse,
    reviewerId,
  })

  await Promise.all(savedVerdicts.map((record) => preloadFeedbackVerdict(record)))

  await createAuditLog({
    ctx,
    userId: reviewerId,
    description: `Feedback submitted for note ${adjudicationBody.note_id}`,
    action: AuditActionEnum.feedbackSubmitted,
    status: mcpSynced,
    modelType: 'FeedbackVerdict',
    modelId: savedVerdicts[0]?.id ?? null,
    noteId: adjudicationBody.note_id,
    metadata: {
      note_id: adjudicationBody.note_id,
      session_id: note.id,
      scorer_version: adjudicationBody.scorer_version,
      reviewer: adjudicationBody.reviewer,
      verdict_count: savedVerdicts.length,
      mcp_synced: mcpSynced,
    },
  })

  if (!mcpSynced) {
    return sendSuccess('Feedback saved locally but MCP adjudication failed', {
      adjudication: adjudicationResponse,
      request: adjudicationBody,
      verdicts: savedVerdicts.map(serializeFeedbackVerdict),
      mcp_synced: false,
    })
  }

  return sendSuccess('Feedback submitted successfully', {
    adjudication: parsedResponse,
    request: adjudicationBody,
    verdicts: savedVerdicts.map(serializeFeedbackVerdict),
    mcp_synced: true,
  })
}

export const getFeedbackVerdicts = async (noteId: string, reviewerId?: number) => {
  const query = FeedbackVerdict.query()
    .whereHas('session', (sessionQuery) => {
      sessionQuery.where('note_id', noteId)
    })
    .preload('reviewer')
    .preload('session')
    .preload('smeIssueTemplate', (templateQuery) => {
      templateQuery.preload('issueDescription').preload('issuesRelatedTo')
    })
    .preload('issueDescription')
    .preload('issuesRelatedTo')

  if (reviewerId) {
    query.where('reviewer_id', reviewerId)
  }

  const verdicts = await query.orderBy('updated_at', 'desc')

  return sendSuccess('Feedback verdicts retrieved successfully', {
    note_id: noteId,
    reviewer_id: reviewerId ?? null,
    count: verdicts.length,
    verdicts: verdicts.map(serializeFeedbackVerdict),
  })
}

export const deleteFeedbackVerdict = async (id: number) => {
  const verdict = await FeedbackVerdict.find(id)

  if (!verdict) {
    return sendError('Feedback verdict not found')
  }

  await verdict.delete()

  return sendSuccess('Feedback verdict deleted successfully', { id })
}
