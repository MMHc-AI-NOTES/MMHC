import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'

export const cptCodeFilterEnum = [
  'id',
  'code',
  'appointment_type_id',
  'name',
  'description',
  'created_at',
]
export const cptCodeSortEnum = [
  'id',
  'code',
  'appointment_type_id',
  'name',
  'description',
  'created_at',
]

export default class CptCode extends BaseModel {
  static table = 'cpt_codes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare code: string

  @column({ columnName: 'appointment_type_id' })
  declare appointmentTypeId: string | null

  @column()
  declare name: string

  @column()
  declare description: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
