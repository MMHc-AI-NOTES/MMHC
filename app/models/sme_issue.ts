import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import Session from '#models/session'
import WebhookSessionVersion from '#models/webhook_session_version'
import ErrorType from '#models/error_type'
import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'

export const smeIssueFilterEnum = [
  'id',
  'reviewer_id',
  'error_type_id',
  'issues_related_to_id',
  'issue_description_id',
  'note_id',
  'version_id',
  'status',
  'created_at',
]
export const smeIssueSortEnum = [
  'id',
  'reviewer_id',
  'error_type_id',
  'issues_related_to_id',
  'issue_description_id',
  'note_id',
  'version_id',
  'status',
  'created_at',
  'updated_at',
]

export default class SmeIssue extends BaseModel {
  static table = 'sme_issues'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reviewerId: number

  @column()
  declare errorTypeId: number

  @column()
  declare issuesRelatedToId: number

  @column()
  declare issueDescriptionId: number | null

  @column()
  declare noteId: string

  @column()
  declare versionId: number | null

  @column({
    serialize: (value: number | null) => {
      if (value === null) return null
      return {
        id: value,
        name: value === 1 ? 'Active' : 'Resolved',
      }
    },
  })
  declare status: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @hasOne(() => ErrorType, {
    foreignKey: 'error_type_id',
  })
  declare errorTypes: HasOne<typeof ErrorType>

  @hasOne(() => IssuesRelatedTo, {
    foreignKey: 'issues_related_to_id',
  })
  declare issuesRelatedTo: HasOne<typeof IssuesRelatedTo>

  @hasOne(() => IssueDescription, {
    foreignKey: 'issuesRelatedToId',
  })
  declare issueDescription: HasOne<typeof IssueDescription>

  @belongsTo(() => User, {
    foreignKey: 'reviewerId',
  })
  declare reviewer: BelongsTo<typeof User>

  @belongsTo(() => Session, {
    foreignKey: 'noteId',
    localKey: 'noteId',
  })
  declare note: BelongsTo<typeof Session>

  @belongsTo(() => WebhookSessionVersion, {
    foreignKey: 'versionId',
  })
  declare version: BelongsTo<typeof WebhookSessionVersion>

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery
}
