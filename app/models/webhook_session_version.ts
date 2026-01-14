import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'

export default class WebhookSessionVersion extends BaseModel {
  static table = 'webhook_session_versions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare noteId: string

  @column({
    columnName: 'session_json',
    prepare: (value: any) => {
      // Ensure value is always a string
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value)
      }
      return typeof value === 'string' ? value : String(value)
    },
  })
  declare sessionJson: string

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
