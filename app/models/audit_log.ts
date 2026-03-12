import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class AuditLog extends BaseModel {
  static table = 'audit_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number | null

  @column()
  declare description: string

  @column()
  declare action: string

  @column()
  declare modelType: string | null

  @column()
  declare modelId: number | null

  @column()
  declare noteId: string | null

  @column()
  declare ipAddress: string

  @column()
  declare userAgent: string

  @column.dateTime({ autoCreate: true })
  declare actionTime: DateTime

  @column()
  declare status: boolean

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: string) => (value ? JSON.parse(value) : null),
  })
  declare metadata: Record<string, any> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null
}
