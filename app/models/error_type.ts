import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'

export const errorTypeFilterEnum = ['id', 'name', 'display_name', 'points', 'created_at']
export const errorTypeSortEnum = [
  'id',
  'name',
  'display_name',
  'points',
  'created_at',
  'updated_at',
]

export default class ErrorType extends BaseModel {
  static table = 'error_types'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column({
    columnName: 'display_name',
  })
  declare displayName: string

  @column()
  declare points: number

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
