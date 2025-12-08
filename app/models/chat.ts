import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export const chatFilterEnum = [
  'id',
  'user_id',
  'model_id',
  'sentiment',
  'evaluation_score',
  'note_id',
]
export const chatSortEnum = [
  'id',
  'user_id',
  'model_id',
  'sentiment',
  'evaluation_score',
  'note_id',
  'created_at',
  'updated_at',
]

export default class Chat extends BaseModel {
  static table = 'chats'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare prompt: string

  @column()
  declare userNote: string

  @column()
  declare modelId: string

  @column()
  declare evaluationScore: number | null

  @column()
  declare sentiment: string | null

  @column()
  declare evaluation: string | null

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: any) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return value
      }
    },
  })
  declare bedrockResponse: object | null

  @column()
  declare noteId: string

  @column()
  declare userId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
