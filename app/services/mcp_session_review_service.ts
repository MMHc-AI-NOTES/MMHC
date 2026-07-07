import { sendSuccess } from '#services/custom_response_service'
import type { invokeMcpSessionReviewValidatorInterface } from '#validators/mcp_session_review_validator'
import Session from '#models/session'
import {
  buildMcpScoreNoteRequest,
  evaluateChatWithMcp,
  resolveMcpClientId,
  toMcpApiResponse,
} from '#services/mcp_service'
import { resolvePreviousSessionContent } from '#services/session_note_resolver'

export const invokeMcpSessionReview = async (
  payload: invokeMcpSessionReviewValidatorInterface
) => {
  console.log('[MCP Session Review] Frontend request:', JSON.stringify(payload, null, 2))

  const session = await Session.query().where('note_id', payload.note_id).preload('patient').first()
  if (!session) {
    throw new Error('Session not found for the provided note')
  }

  const previousNote = await resolvePreviousSessionContent(session)
  const clientId = resolveMcpClientId(session)

  const mcpRequest = buildMcpScoreNoteRequest({
    noteId: session.noteId,
    clientId,
    currentNote: session.session,
    previousNote,
  })

  console.log('[MCP Session Review] MCP request:', JSON.stringify(mcpRequest, null, 2))

  const evaluation = await evaluateChatWithMcp({
    noteId: session.noteId,
    clientId,
    currentNote: session.session,
    previousNote,
  })

  const mcpResponse = toMcpApiResponse(evaluation)

  console.log('[MCP Session Review] MCP response:', JSON.stringify(mcpResponse, null, 2))

  return sendSuccess('MCP session review response (playground, not saved)', {
    isPlayground: true,
    mcp_response: mcpResponse,
  })
}
