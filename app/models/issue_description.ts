import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'

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
