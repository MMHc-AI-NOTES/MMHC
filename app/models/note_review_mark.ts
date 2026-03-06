import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import Session from '#models/session'
import WebhookSessionVersion from '#models/webhook_session_version'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class NoteReviewMark extends BaseModel {
  static table = 'note_review_marks'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare noteId: string

  @column()
  declare noteVersionId: number | null

  @column()
  declare reviewerId: number

  @column()
  declare markedAsReviewed: boolean

  @column.dateTime()
  declare markedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'reviewerId',
  })
  declare reviewer: BelongsTo<typeof User>

  @belongsTo(() => Session, {
    foreignKey: 'noteId',
    localKey: 'noteId',
  })
  declare note: BelongsTo<typeof Session>

  @belongsTo(() => WebhookSessionVersion, {
    foreignKey: 'noteVersionId',
  })
  declare noteVersion: BelongsTo<typeof WebhookSessionVersion>
}
