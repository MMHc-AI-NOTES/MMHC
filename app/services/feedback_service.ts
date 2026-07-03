import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import FeedbackVerdict from '#models/feedback_verdict'
import Session from '#models/session'
import Chat from '#models/chat'
import axios from 'axios'
import { mcpConfig } from '#config/services'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import type { SubmitFeedbackPayload } from '#validators/feedback_validator'
import { feedbackVerdictToMcpString } from '#enums/feedback_verdict_enum'
import { MCP_MODEL_ID } from '#services/mcp_chat_service'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export async function resolveScorerVersion(noteId: string) {
  const chat = await Chat.query().where('note_id', noteId).orderBy('id', 'desc').first()
  console.log('[Feedback] Scorer version:', chat?.modelId)
  return chat?.modelId || MCP_MODEL_ID
}

export async function resolveSessionByNoteId(noteId: string) {
  return Session.query().where('note_id', noteId).orderBy('id', 'desc').first()
}

export async function loadFeedbackVerdictsForSession(sessionId: number, reviewerId?: number) {
  const query = FeedbackVerdict.query()
    .where('session_id', sessionId)
    .preload('reviewer')
    .preload('smeIssueTemplate', (q) => q.preload('issueDescription').preload('issuesRelatedTo'))
    .preload('issueDescription')
    .preload('issuesRelatedTo')
    .orderBy('updated_at', 'desc')

  if (reviewerId) {
    query.where('reviewer_id', reviewerId)
  }

  return query
}

export function formatFeedbackVerdictResponse(record: FeedbackVerdict) {
  const template = record.smeIssueTemplate
  const issueDescription = record.issueDescription ?? template?.issueDescription
  const issuesRelatedTo = record.issuesRelatedTo ?? template?.issuesRelatedTo

  return {
    id: record.id,
    section: issuesRelatedTo?.displayName ?? null,
    description_id: template?.descriptionId ?? null,
    description: issueDescription?.description ?? null,
    code: template?.descriptionId ?? null,
    side: record.side,
    verdict: record.verdict,
    comment: record.comment,
    by: record.reviewer?.fullName ?? null,
  }
}

export async function submitFeedback(
  payload: SubmitFeedbackPayload,
  reviewerId: number,
  ctx?: HttpContext,
  reviewerName?: string | null
) {
  const session = await resolveSessionByNoteId(payload.note_id)
  if (!session) {
    return sendError('Note not found for the provided note_id')
  }

  const template = await SmeIssuesTamplate.query()
    .where('description_id', payload.description_id)
    .preload('issueDescription')
    .preload('issuesRelatedTo')
    .first()

  if (!template) {
    return sendError('Issue template not found for the provided description_id')
  }

  const descriptionId = template.descriptionId ?? payload.description_id
  const reviewer = reviewerName ?? ''
  const reviewedAt = DateTime.now()
  const scorerVersion = await resolveScorerVersion(session.noteId)

  const adjudicationBody = {
    note_id: session.noteId,
    scorer_version: scorerVersion,
    reviewer,
    reviewed_at: reviewedAt.toISO(),
    verdicts: [
      {
        section: template.issuesRelatedTo?.displayName ?? '',
        description_id: descriptionId,
        description: template.issueDescription?.description ?? '',
        code: descriptionId,
        side: 'AI',
        verdict: feedbackVerdictToMcpString(payload.verdict),
        comment: payload.comment ?? '',
        by: reviewer,
      },
    ],
  }

  let mcpResponse: unknown = null
  let mcpSynced = false

  if (mcpConfig.apiUrl) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (mcpConfig.token) {
      headers.authorization = mcpConfig.token.startsWith('Bearer ')
        ? mcpConfig.token
        : `Bearer ${mcpConfig.token}`
    }

    const url = `${mcpConfig.apiUrl.replace(/\/$/, '')}/adjudications`

    console.log('[Feedback] MCP request:', JSON.stringify(adjudicationBody, null, 2))

    try {
      const res = await axios.post(url, adjudicationBody, { headers, validateStatus: () => true })
      mcpResponse = res.data
      mcpSynced = res.status >= 200 && res.status < 300
      console.log('[Feedback] MCP response status:', res.status)
      console.log('[Feedback] MCP response body:', mcpResponse)
    } catch (error: any) {
      const message =
        error.code === 'ECONNREFUSED'
          ? `MCP server not reachable at ${mcpConfig.apiUrl}`
          : (error.message ?? 'MCP API call failed')

      mcpResponse = { error: message, code: error.code ?? null }
      mcpSynced = false
      console.log('[Feedback] MCP call failed:', message)
    }
  }

  let query = FeedbackVerdict.query()
    .where('session_id', session.id)
    .where('reviewer_id', reviewerId)
    .where('side', 'AI')
    .where('sme_issue_template_id', template.id)

  if (template.issueDescriptionId) {
    query = query.where('issue_description_id', template.issueDescriptionId)
  } else {
    query = query.whereNull('issue_description_id')
  }

  const existing = await query.first()

  const data = {
    sessionId: session.id,
    reviewerId,
    smeIssueTemplateId: template.id,
    issueDescriptionId: template.issueDescriptionId,
    issuesRelatedToId: template.issuesRelatedToId,
    scorerVersion,
    reviewedAt,
    side: 'AI',
    verdict: payload.verdict,
    comment: payload.comment ?? null,
    adjudicationRequest: payload,
    adjudicationResponse: mcpResponse && typeof mcpResponse === 'object' ? mcpResponse : null,
  }

  let record: FeedbackVerdict
  if (existing) {
    await existing.merge(data).save()
    record = existing
  } else {
    record = await FeedbackVerdict.create(data)
  }

  await record.load('reviewer')
  await record.load('smeIssueTemplate', (q) =>
    q.preload('issueDescription').preload('issuesRelatedTo')
  )

  await createAuditLog({
    ctx,
    userId: reviewerId,
    description: `Feedback submitted for note ${session.noteId}`,
    action: AuditActionEnum.feedbackSubmitted,
    status: mcpSynced,
    modelType: 'FeedbackVerdict',
    modelId: record.id,
    noteId: session.noteId,
    metadata: { note_id: session.noteId, session_id: session.id, mcp_synced: mcpSynced },
  })

  return sendSuccess(
    mcpSynced ? 'Feedback submitted successfully' : 'Feedback saved but MCP call failed',
    {
      verdict: formatFeedbackVerdictResponse(record),
      mcp_synced: mcpSynced,
      adjudication: mcpResponse,
    }
  )
}

export async function getFeedbackVerdicts(noteId: string, reviewerId?: number) {
  const session = await resolveSessionByNoteId(noteId)
  if (!session) {
    return sendError('Note not found for the provided note_id')
  }

  const verdicts = await loadFeedbackVerdictsForSession(session.id, reviewerId)

  return sendSuccess('Feedback verdicts retrieved successfully', {
    note_id: noteId,
    session_id: session.id,
    verdicts: verdicts.map(formatFeedbackVerdictResponse),
  })
}

export async function deleteFeedbackVerdict(id: number) {
  const verdict = await FeedbackVerdict.find(id)
  if (!verdict) {
    return sendError('Feedback verdict not found')
  }

  await verdict.delete()
  return sendSuccess('Feedback verdict deleted successfully', { id })
}
