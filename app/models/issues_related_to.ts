import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'

export const issuesRelatedToFilterEnum = [
  'id',
  'field_id',
  'display_name',
  'note_type',
  'created_at',
]
export const issuesRelatedToSortEnum = [
  'id',
  'field_id',
  'display_name',
  'note_type',
  'created_at',
  'updated_at',
]

export default class IssuesRelatedTo extends BaseModel {
  static table = 'issues_related_to'

  @column({ isPrimary: true })
  declare id: number

  @column({
    columnName: 'field_id',
  })
  declare fieldId: string

  @column({
    columnName: 'display_name',
  })
  declare displayName: string

  @column({
    columnName: 'note_type',
  })
  declare noteType: string | null

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
