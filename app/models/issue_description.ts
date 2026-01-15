import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import SmeIssue from './sme_issue.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export const issueDescriptionFilterEnum = ['id', 'key', 'description', 'created_at']
export const issueDescriptionSortEnum = ['id', 'key', 'description', 'created_at', 'updated_at']

export default class IssueDescription extends BaseModel {
  static table = 'issue_descriptions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare key: string

  @column()
  declare description: string

  @belongsTo(() => SmeIssue)
  declare smeIssue: BelongsTo<typeof SmeIssue>

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
