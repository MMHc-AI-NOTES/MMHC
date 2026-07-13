import { sendSuccess } from '#services/custom_response_service'
import type { invokeMcpSessionReviewValidatorInterface } from '#validators/mcp_session_review_validator'
import {
  buildMcpScoreNoteRequest,
  evaluateChatWithMcp,
  resolveMcpClientId,
  resolveMcpCptCode,
  toMcpApiResponse,
} from '#services/mcp_service'
import { getDiagnosisFromAuditLog } from '#services/note_service'
import { resolvePreviousSessionContent } from '#services/session_note_resolver'
import { getSessionByNoteId } from '#services/webhook_service'

export const invokeMcpSessionReview = async (payload: invokeMcpSessionReviewValidatorInterface) => {
  try {
    const session = await getSessionByNoteId(payload.note_id)
    await session.load('patient')
    await session.load('cptCode')

    const previousNote = await resolvePreviousSessionContent(session)
    const clientId = resolveMcpClientId(session)
    const cptCode = resolveMcpCptCode(session)
    const diagnosis = await getDiagnosisFromAuditLog(session.noteId)

    const mcpRequest = buildMcpScoreNoteRequest({
      noteId: session.noteId,
      clientId,
      cptCode,
      diagnosis,
      currentNote: session.session,
      previousNote,
    })

    console.log('[MCP Session Review] MCP request:', JSON.stringify(mcpRequest, null, 2))

    const evaluation = await evaluateChatWithMcp({
      noteId: session.noteId,
      clientId,
      cptCode,
      diagnosis,
      currentNote: session.session,
      previousNote,
    })

    const mcpResponse = toMcpApiResponse(evaluation)

    console.log('[MCP Session Review] MCP response:', JSON.stringify(mcpResponse, null, 2))

    return sendSuccess('MCP session review response', mcpResponse)
  } catch (error: any) {
    console.log('Error in invokeMcpSessionReview:', error.message)
    throw error
  }
}
