import FeedbackVerdict from '#models/feedback_verdict'
import { mcpConfig } from '#config/services'
import axios, { HttpStatusCode } from 'axios'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import type { SubmitFeedbackPayload } from '#validators/feedback_validator'
import { FeedbackVerdictEnum } from '#enums/feedback_verdict_enum'
import { MCP_MODEL_ID } from '#services/mcp_chat_service'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { getSessionBySessionId } from '#services/webhook_service'
import { getSmeIssueTemplateByDescriptionId } from '#services/sme_issue_template_service'
import { getLatestChatByNoteId } from '#services/chat_service'
import { getUserById } from '#services/user_service'

const FEEDBACK_SIDE = 'AI'

export async function resolveScorerVersion(noteId: string) {
  const chat = await getLatestChatByNoteId(noteId)
  return chat?.modelId || MCP_MODEL_ID
}
export async function loadFeedbackVerdictsForSession(sessionId: string | number) {
  let internalSessionId: number

  if (typeof sessionId === 'number') {
    internalSessionId = sessionId
  } else {
    const session = await getSessionBySessionId(sessionId)
    if (!session) {
      return []
    }
    internalSessionId = session.id
  }

  return FeedbackVerdict.query()
    .where('session_id', internalSessionId)
    .preload('reviewer')
    .preload('smeIssueTemplate', (q) => q.preload('issueDescription').preload('issuesRelatedTo'))
    .preload('issueDescription')
    .preload('issuesRelatedTo')
    .orderBy('updated_at', 'desc')
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
  ctx?: HttpContext
) {
  const session = (await getSessionBySessionId(payload.session_id))!

  const template = await getSmeIssueTemplateByDescriptionId(payload.description_id)
  if (!template) {
    return sendError('Issue template not found for the provided description_id')
  }

  const descriptionId = template.descriptionId ?? payload.description_id
  const reviewer = (await getUserById(reviewerId)).fullName
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
        side: FEEDBACK_SIDE,
        verdict:
          payload.verdict === FeedbackVerdictEnum.UP.id
            ? FeedbackVerdictEnum.UP.mcp_label
            : FeedbackVerdictEnum.DOWN.mcp_label,
        comment: payload.comment ?? '',
        by: reviewer,
      },
    ],
  }
  let query = FeedbackVerdict.query()
    .where('session_id', session.id)
    .where('reviewer_id', reviewerId)
    .where('side', FEEDBACK_SIDE)
    .where('sme_issue_template_id', template.id)

  if (template.issueDescriptionId) {
    query = query.where('issue_description_id', template.issueDescriptionId)
  } else {
    query = query.whereNull('issue_description_id')
  }

  const existing = await query.first()

  if (existing && existing.reviewerId !== reviewerId) {
    return sendError('You are not allowed to update this feedback')
  }

  const data = {
    sessionId: session.id,
    reviewerId,
    smeIssueTemplateId: template.id,
    issueDescriptionId: template.issueDescriptionId,
    issuesRelatedToId: template.issuesRelatedToId,
    scorerVersion,
    reviewedAt,
    side: FEEDBACK_SIDE,
    verdict: payload.verdict,
    comment: payload.comment ?? null,
    adjudicationRequest: adjudicationBody,
    adjudicationResponse: null as object | null,
  }

  let record: FeedbackVerdict
  if (existing) {
    await existing.merge(data).save()
    record = existing
  } else {
    record = await FeedbackVerdict.create(data)
  }

  let mcpResponse: unknown = null
  let mcpSynced = false
  const url = `${mcpConfig.apiUrl}/adjudications`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'authorization': `Bearer ${mcpConfig.token}`,
  }
  console.log('request body', JSON.stringify(adjudicationBody, null, 2))
  try {
    const res = await axios.post(url, adjudicationBody, { headers, validateStatus: () => true })
    if (res.status !== HttpStatusCode.Ok) {
      mcpSynced = false
      mcpResponse = res.data
    } else {
      mcpSynced = true
      mcpResponse = res.data
    }
    console.log('[Feedback] MCP response status:', res.status)
    console.log('[Feedback] MCP response body:', JSON.stringify(mcpResponse, null, 2))
  } catch (error: any) {
    mcpResponse = { error: error.message ?? 'MCP API call failed', code: error.code ?? null }
    mcpSynced = false
    console.log('[Feedback] MCP call failed:', error.message)
  }

  record.adjudicationResponse =
    mcpResponse && typeof mcpResponse === 'object' ? (mcpResponse as object) : null
  await record.save()

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
    metadata: {
      note_id: session.noteId,
      session_id: session.sessionId,
      mcp_synced: mcpSynced,
    },
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

export async function getFeedbackVerdicts(sessionId: string) {
  const session = (await getSessionBySessionId(sessionId))!

  const verdicts = await loadFeedbackVerdictsForSession(sessionId)

  return sendSuccess('Feedback verdicts retrieved successfully', {
    session_id: session.sessionId,
    note_id: session.noteId,
    verdicts: verdicts.map(formatFeedbackVerdictResponse),
  })
}

export async function deleteFeedbackVerdict(id: number, reviewerId: number) {
  const verdict = await FeedbackVerdict.find(id)
  if (!verdict) {
    return sendError('Feedback verdict not found')
  }

  if (verdict.reviewerId !== reviewerId) {
    return sendError('You are not allowed to delete this feedback')
  }

  await verdict.delete()
  return sendSuccess('Feedback verdict deleted successfully', { id })
}
