import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import ErrorType from '#models/error_type'
import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SmeIssuesTamplate extends BaseModel {
  static table = 'sme_issues_tamplate'

  @column({ isPrimary: true })
  declare id: number

  @column({
    columnName: 'error_type_id',
  })
  declare errorTypeId: number

  @column({
    columnName: 'issues_related_to_id',
  })
  declare issuesRelatedToId: number

  @column({
    columnName: 'issue_description_id',
  })
  declare issueDescriptionId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @belongsTo(() => ErrorType, {
    foreignKey: 'errorTypeId',
  })
  declare errorType: BelongsTo<typeof ErrorType>

  @belongsTo(() => IssuesRelatedTo, {
    foreignKey: 'issuesRelatedToId',
  })
  declare issuesRelatedTo: BelongsTo<typeof IssuesRelatedTo>

  @belongsTo(() => IssueDescription, {
    foreignKey: 'issueDescriptionId',
  })
  declare issueDescription: BelongsTo<typeof IssueDescription>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
