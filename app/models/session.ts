import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import Chat from '#models/chat'
import Patient from '#models/patient'
import HumanReview from '#models/human_review'
import CptCode from '#models/cpt_code'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import {
  SessionTypeEnum,
  AiStatusEnum,
  HumanReviewEnum,
  ManagerEnum,
  WorkflowEnum,
  PriorityEnum,
} from '#enums/session_enum'
import { ReviewCycleEnum, ReviewCycleDisplayNames } from '#enums/review_cycle_enum'

export const sessionFilterEnum = [
  'id',
  'note_id',
  'session_id',
  'practitioner_id',
  'patient_id',
  'type',
  'ai_score',
  'ai_status',
  'human_review',
  'manager',
  'workflow',
  'priority',
  'search',
  'cpt_code_id',
  'created_at',
]
export const sessionSortEnum = [
  'id',
  'note_id',
  'session_id',
  'practitioner_id',
  'patient_id',
  'type',
  'ai_score',
  'ai_status',
  'human_review',
  'manager',
  'workflow',
  'priority',
  'cpt_code_id',
  'created_at',
  'updated_at',
]

export default class Session extends BaseModel {
  static table = 'session_table'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare noteId: string

  @column()
  declare sessionId: string

  @column()
  declare session: string

  @column.dateTime()
  declare sessionTime: DateTime

  @column()
  declare practitionerId: number

  @column()
  declare patientId: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(SessionTypeEnum).find(
        (k) => SessionTypeEnum[k as keyof typeof SessionTypeEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare type: number | null

  @column({ columnName: 'ai_score' })
  declare aiScore: number | null

  @column({
    columnName: 'ai_status',
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
    columnName: 'human_review',
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(HumanReviewEnum).find(
        (k) => HumanReviewEnum[k as keyof typeof HumanReviewEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare humanReview: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(ManagerEnum).find(
        (k) => ManagerEnum[k as keyof typeof ManagerEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare manager: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(WorkflowEnum).find(
        (k) => WorkflowEnum[k as keyof typeof WorkflowEnum] === value
      )
      return key ? { id: value, name: key } : { id: value, name: null }
    },
  })
  declare workflow: number | null

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

  @column()
  declare cptCodeId: number | null

  @column({
    columnName: 'review_cycle',
    serialize: (value: number | null) => {
      if (value === null) return null
      const key = Object.keys(ReviewCycleEnum).find(
        (k) => ReviewCycleEnum[k as keyof typeof ReviewCycleEnum] === value
      )
      const displayName = ReviewCycleDisplayNames[value] || null
      return key ? { id: value, name: displayName || key } : { id: value, name: null }
    },
  })
  declare reviewCycle: number | null

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

  @belongsTo(() => Patient, {
    foreignKey: 'patientId',
  })
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => CptCode, {
    foreignKey: 'cptCodeId',
  })
  declare cptCode: BelongsTo<typeof CptCode>

  @hasMany(() => Chat, {
    foreignKey: 'noteId',
    localKey: 'noteId',
  })
  declare chats: HasMany<typeof Chat>

  @hasMany(() => HumanReview, {
    foreignKey: 'noteId',
    localKey: 'noteId',
  })
  declare humanReviews: HasMany<typeof HumanReview>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
