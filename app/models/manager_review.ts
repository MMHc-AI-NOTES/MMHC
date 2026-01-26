import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import HumanReview from '#models/human_review'
import Session from '#models/session'
import Chat from '#models/chat'
import WebhookSessionVersion from '#models/webhook_session_version'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { HumanReviewResultEnum, HumanReviewDecisionEnum } from '#enums/human_review_enum'
import { ManagerReviewDecisionEnum } from '#enums/manager_review_enum'
import { AiStatusEnum, PriorityEnum } from '#enums/session_enum'
import { DisagreementLevelEnum } from '#enums/disagreement_enum'

export const managerReviewFilterEnum = [
  'id',
  'manager_id',
  'review_id',
  'note_id',
  'version_id',
  'chat_id',
  'practitioner_id',
  'reviewer_id',
  'decision',
  'manual_score',
  'ai_score',
  'disagreement',
  'ai_status',
  'priority',
  'human_result',
  'human_decision',
  'created_at',
  'search',
]

export const managerReviewSortEnum = [
  'id',
  'manager_id',
  'review_id',
  'note_id',
  'version_id',
  'chat_id',
  'practitioner_id',
  'reviewer_id',
  'decision',
  'manual_score',
  'ai_score',
  'disagreement',
  'human_decision',
  'created_at',
  'updated_at',
]

export default class ManagerReview extends BaseModel {
  static table = 'manager_reviews'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare managerId: number

  @column()
  declare reviewId: number

  @column()
  declare noteId: string

  @column()
  declare versionId: number | null

  @column()
  declare chatId: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(ManagerReviewDecisionEnum).find(
        (k) => ManagerReviewDecisionEnum[k as keyof typeof ManagerReviewDecisionEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare decision: number

  @column()
  declare practitionerId: number

  @column()
  declare reviewerId: number | null

  @column()
  declare manualScore: number | null

  @column()
  declare aiScore: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(DisagreementLevelEnum).find(
        (k) => DisagreementLevelEnum[k as keyof typeof DisagreementLevelEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare disagreement: number | null

  @column()
  declare comment: string | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(AiStatusEnum).find(
        (k) => AiStatusEnum[k as keyof typeof AiStatusEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare aiStatus: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(PriorityEnum).find(
        (k) => PriorityEnum[k as keyof typeof PriorityEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare priority: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(HumanReviewResultEnum).find(
        (k) => HumanReviewResultEnum[k as keyof typeof HumanReviewResultEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare humanResult: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(HumanReviewDecisionEnum).find(
        (k) => HumanReviewDecisionEnum[k as keyof typeof HumanReviewDecisionEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare humanDecision: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'managerId',
  })
  declare manager: BelongsTo<typeof User>

  @belongsTo(() => HumanReview, {
    foreignKey: 'reviewId',
  })
  declare review: BelongsTo<typeof HumanReview>

  @belongsTo(() => Session, {
    foreignKey: 'noteId',
    localKey: 'noteId',
  })
  declare session: BelongsTo<typeof Session>

  @belongsTo(() => WebhookSessionVersion, {
    foreignKey: 'versionId',
  })
  declare version: BelongsTo<typeof WebhookSessionVersion>

  @belongsTo(() => Chat, {
    foreignKey: 'chatId',
  })
  declare chat: BelongsTo<typeof Chat>

  @belongsTo(() => User, {
    foreignKey: 'practitionerId',
  })
  declare practitioner: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'reviewerId',
  })
  declare reviewer: BelongsTo<typeof User>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
