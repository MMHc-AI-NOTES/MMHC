import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import SmeIssue from '#models/sme_issue'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export const issuesRelatedToFilterEnum = ['id', 'field_id', 'display_name', 'created_at']
export const issuesRelatedToSortEnum = [
  'id',
  'field_id',
  'display_name',
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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @belongsTo(() => SmeIssue)
  declare smeIssue: BelongsTo<typeof SmeIssue>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
