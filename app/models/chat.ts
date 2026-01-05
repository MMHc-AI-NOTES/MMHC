import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import HumanReview from '#models/human_review'
import Agent from '#models/agent'
import { ChatSeverityEnum, ChatTriggerSourceEnum, ChatResultEnum } from '#enums/chat_enum'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export const chatFilterEnum = [
  'id',
  'user_id',
  'model_id',
  'sentiment',
  'evaluation_score',
  'note_id',
  'created_at',
  'agent_id',
  'severity',
  'result',
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
  'severity',
  'result',
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
  declare userInput: string | null

  @column()
  declare modelId: string

  @column()
  declare evaluationScore: number | null

  @column()
  declare responseTime: number | null

  @column.dateTime()
  declare startTime: DateTime | null

  @column.dateTime()
  declare endTime: DateTime | null

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

  @column()
  declare agentId: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(ChatSeverityEnum).find(
        (k) => ChatSeverityEnum[k as keyof typeof ChatSeverityEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare severity: number | null

  @column({
    columnName: 'trigger_source',
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(ChatTriggerSourceEnum).find(
        (k) => ChatTriggerSourceEnum[k as keyof typeof ChatTriggerSourceEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare triggerSource: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(ChatResultEnum).find(
        (k) => ChatResultEnum[k as keyof typeof ChatResultEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare result: number | null

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

  @belongsTo(() => Agent, {
    foreignKey: 'agentId',
  })
  declare agent: BelongsTo<typeof Agent>

  @hasMany(() => HumanReview, {
    foreignKey: 'chatId',
    localKey: 'id',
  })
  declare humanReviews: HasMany<typeof HumanReview>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
