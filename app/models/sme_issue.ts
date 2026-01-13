import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, belongsTo, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'
import User from '#models/user'
import Session from '#models/session'
import WebhookSessionVersion from '#models/webhook_session_version'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import {
  ErrorTypeDisplayNames,
  ErrorTypePoints,
  IssuesRelatedToDisplayNames,
} from '#enums/manual_issue_enum'

export const smeIssueFilterEnum = [
  'id',
  'reviewer_id',
  'error_type',
  'issues_related_to',
  'note_id',
  'version_id',
  'status',
  'created_at',
]
export const smeIssueSortEnum = [
  'id',
  'reviewer_id',
  'error_type',
  'issues_related_to',
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

  @column({
    columnName: 'reviewer_id',
  })
  declare reviewerId: number

  @column({
    columnName: 'error_type',
    serialize: (value: number | null) => {
      if (value === null) return null
      return {
        id: value,
        name: ErrorTypeDisplayNames[value] || null,
        points: ErrorTypePoints[value] || 0,
      }
    },
  })
  declare errorType: number

  @column({
    columnName: 'issues_related_to',
    serialize: (value: number | null) => {
      if (value === null) return null
      return {
        id: value,
        name: IssuesRelatedToDisplayNames[value] || null,
      }
    },
  })
  declare issuesRelatedTo: number

  @column()
  declare description: string

  @column({
    columnName: 'note_id',
  })
  declare noteId: string

  @column({
    columnName: 'version_id',
  })
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
