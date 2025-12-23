import Audit from '#models/audit'
import logger from '@adonisjs/core/services/logger'

type AuditPayload = {
  event: string
  auditableType: string
  auditableId: number | null
  userType?: string | null
  userId?: number | null
  noteId?: string | null
  oldValues?: any
  newValues?: any
  metadata?: any
}

const safeStringify = (value: any): string | null => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch (error) {
    logger.warn('Failed to stringify audit payload: %s', (error as Error).message)
    return null
  }
}

export const AuditService = {
  async createAuditLog(payload: AuditPayload) {
    try {
      await Audit.create({
        event: payload.event,
        auditableType: payload.auditableType,
        auditableId: payload.auditableId ?? 0,
        userType: payload.userType ?? null,
        userId: payload.userId ?? null,
        noteId: payload.noteId ?? null,
        oldValues: safeStringify(payload.oldValues),
        newValues: safeStringify(payload.newValues),
        metadata: safeStringify(payload.metadata),
      })
    } catch (error: any) {
      logger.warn('Failed to create audit log: %s', error.message)
    }
  },

  async auditNoteCreated(session: any, metadata: Record<string, any> = {}) {
    await this.createAuditLog({
      event: 'note_created',
      auditableType: session.constructor?.name || 'Session',
      auditableId: session.id ?? null,
      userType: 'system',
      userId: null,
      noteId: session.noteId ?? null,
      oldValues: null,
      newValues: session.toJSON ? session.toJSON() : session,
      metadata,
    })
  },

  async auditNoteUpdated(
    session: any,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
    metadata: Record<string, any> = {}
  ) {
    await this.createAuditLog({
      event: 'note_updated',
      auditableType: session.constructor?.name || 'Session',
      auditableId: session.id ?? null,
      userType: 'system',
      userId: null,
      noteId: session.noteId ?? null,
      oldValues,
      newValues,
      metadata,
    })
  },
}
