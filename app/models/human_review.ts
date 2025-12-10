import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import Session from '#models/session'
import Chat from '#models/chat'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { HumanReviewDecisionEnum } from '#enums/human_review_enum'

export const humanReviewFilterEnum = [
  'id',
  'note_id',
  'chat_id',
  'practitioner_id',
  'decision',
  'manual_score',
  'created_at',
]

export const humanReviewSortEnum = [
  'id',
  'note_id',
  'chat_id',
  'practitioner_id',
  'decision',
  'manual_score',
  'created_at',
  'updated_at',
]

export default class HumanReview extends BaseModel {
  static table = 'human_reviews'

  @column({ isPrimary: true })
  declare id: number

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(HumanReviewDecisionEnum).find(
        (k) => HumanReviewDecisionEnum[k as keyof typeof HumanReviewDecisionEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare decision: number

  @column({ columnName: 'note_id' })
  declare noteId: string

  @column({ columnName: 'chat_id' })
  declare chatId: number | null

  @column({ columnName: 'practitioner_id' })
  declare practitionerId: number

  @column({ columnName: 'manual_score' })
  declare manualScore: number | null

  @column()
  declare comment: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'practitionerId',
  })
  declare practitioner: BelongsTo<typeof User>

  @belongsTo(() => Session, {
    foreignKey: 'noteId',
    localKey: 'noteId',
  })
  declare note: BelongsTo<typeof Session>

  @belongsTo(() => Chat, {
    foreignKey: 'chatId',
  })
  declare chat: BelongsTo<typeof Chat>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
