import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import Session from '#models/session'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import IssueDescription from '#models/issue_description'
import IssuesRelatedTo from '#models/issues_related_to'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class FeedbackVerdict extends BaseModel {
  static table = 'feedback_verdicts'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'session_id' })
  declare sessionId: number

  @column({ columnName: 'reviewer_id' })
  declare reviewerId: number

  @column({ columnName: 'sme_issue_template_id' })
  declare smeIssueTemplateId: number | null

  @column({ columnName: 'issue_description_id' })
  declare issueDescriptionId: number | null

  @column({ columnName: 'issues_related_to_id' })
  declare issuesRelatedToId: number | null

  @column({ columnName: 'scorer_version' })
  declare scorerVersion: string | null

  @column.dateTime({ columnName: 'reviewed_at' })
  declare reviewedAt: DateTime

  @column()
  declare side: string

  @column()
  declare verdict: number

  @column()
  declare comment: string | null

  @column({
    columnName: 'adjudication_request',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: unknown) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return value
      }
    },
  })
  declare adjudicationRequest: object | null

  @column({
    columnName: 'adjudication_response',
    prepare: (value: unknown) => (value ? JSON.stringify(value) : null),
    consume: (value: unknown) => {
      if (!value) return null
      try {
        return typeof value === 'string' ? JSON.parse(value) : value
      } catch {
        return value
      }
    },
  })
  declare adjudicationResponse: object | null

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'reviewerId',
  })
  declare reviewer: BelongsTo<typeof User>

  @belongsTo(() => Session, {
    foreignKey: 'sessionId',
  })
  declare session: BelongsTo<typeof Session>

  @belongsTo(() => SmeIssuesTamplate, {
    foreignKey: 'smeIssueTemplateId',
  })
  declare smeIssueTemplate: BelongsTo<typeof SmeIssuesTamplate>

  @belongsTo(() => IssueDescription, {
    foreignKey: 'issueDescriptionId',
  })
  declare issueDescription: BelongsTo<typeof IssueDescription>

  @belongsTo(() => IssuesRelatedTo, {
    foreignKey: 'issuesRelatedToId',
  })
  declare issuesRelatedTo: BelongsTo<typeof IssuesRelatedTo>
}
