import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import Chat from '#models/chat'
import Patient from '#models/patient'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

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
  'created_at',
  'updated_at',
]

export default class Session extends BaseModel {
  static table = 'session_table'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'note_id' })
  declare noteId: string

  @column({ columnName: 'session_id' })
  declare sessionId: string

  @column()
  declare session: string

  @column.dateTime({ columnName: 'session_time' })
  declare sessionTime: DateTime

  @column({ columnName: 'practitioner_id' })
  declare practitionerId: number

  @column({ columnName: 'patient_id' })
  declare patientId: number | null

  @column()
  declare type: number | null

  @column({ columnName: 'ai_score' })
  declare aiScore: number | null

  @column({ columnName: 'ai_status' })
  declare aiStatus: number | null

  @column({ columnName: 'human_review' })
  declare humanReview: number | null

  @column()
  declare manager: number | null

  @column()
  declare workflow: number | null

  @column()
  declare priority: number | null

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

  @hasMany(() => Chat, {
    foreignKey: 'noteId',
    localKey: 'noteId',
  })
  declare chats: HasMany<typeof Chat>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
