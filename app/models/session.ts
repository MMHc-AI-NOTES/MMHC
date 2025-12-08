import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import Chat from '#models/chat'
import Patient from '#models/patient'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export const sessionFilterEnum = ['id', 'note_id', 'session_id', 'practitioner_id', 'patient_id']
export const sessionSortEnum = [
  'id',
  'note_id',
  'session_id',
  'practitioner_id',
  'patient_id',
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
