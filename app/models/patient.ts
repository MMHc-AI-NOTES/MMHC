import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, column, hasMany } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import Session from '#models/session'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export const patientFilterEnum = ['id', 'client_id', 'created_at', 'search']
export const patientSortEnum = ['id', 'client_id', 'created_at']

export default class Patient extends BaseModel {
  static table = 'patients'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clientId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @hasMany(() => Session, {
    foreignKey: 'patientId',
  })
  declare sessions: HasMany<typeof Session>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
