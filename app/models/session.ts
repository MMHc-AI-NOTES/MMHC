import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export const sessionFilterEnum = ['id', 'note_id', 'session_id', 'practitioner_id']
export const sessionSortEnum = [
  'id',
  'note_id',
  'session_id',
  'practitioner_id',
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

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
