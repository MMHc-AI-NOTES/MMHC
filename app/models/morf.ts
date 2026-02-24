import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Morf extends BaseModel {
  static table = 'morf_data'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare noteId: string

  @column()
  declare data: any

  @column({ columnName: 'is_processed' })
  declare isProcessed: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
