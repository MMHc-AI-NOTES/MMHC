import AuditLog from '#models/audit_log'
import { sendSuccess } from '#services/custom_response_service'

export const getNoteActivity = async (noteId: string) => {
  const logs = await AuditLog.query().where('note_id', noteId).orderBy('action_time', 'desc')

  return sendSuccess('Note activity retrieved successfully', logs)
}
