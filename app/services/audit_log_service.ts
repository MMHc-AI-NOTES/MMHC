import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

type AuditLogMetadata = Record<string, any> | null | undefined

interface CreateAuditLogParams {
  ctx?: HttpContext
  userId?: number | null
  description: string
  action: string
  status: boolean
  modelType?: string | null
  modelId?: number | null
  noteId?: string | null
  metadata?: AuditLogMetadata
}

export const createAuditLog = async (params: CreateAuditLogParams) => {
  try {
    const ctx = params.ctx

    let userId: number | null = params.userId ?? null
    if (!userId && ctx) {
      const authUser = await ctx.auth
        .check()
        .then((isLoggedIn) => (isLoggedIn ? ctx.auth.user : null))
      if (authUser) {
        userId = authUser.id
      }
    }

    const ipAddress = ctx?.request.ip() || ''
    const userAgent = ctx?.request.header('user-agent') || ''

    await AuditLog.create({
      userId,
      description: params.description,
      action: params.action,
      modelType: params.modelType ?? null,
      modelId: params.modelId ?? null,
      noteId: params.noteId ?? null,
      ipAddress,
      userAgent,
      actionTime: DateTime.now(),
      status: params.status,
      metadata: params.metadata ?? null,
    })
  } catch (error: any) {
    logger.error('Error creating audit log:', error.message)
  }
}
