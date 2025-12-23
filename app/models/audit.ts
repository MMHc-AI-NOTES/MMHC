import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Audit extends BaseModel {
  static table = 'audits'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userType: string | null

  @column()
  declare userId: number | null

  @column()
  declare event: string

  @column()
  declare auditableType: string

  @column()
  declare auditableId: number

  @column({ columnName: 'old_values' })
  declare oldValues: string | null

  @column({ columnName: 'new_values' })
  declare newValues: string | null

  @column()
  declare metadata: string | null

  @column()
  declare noteId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'userId',
  })
  declare user: BelongsTo<typeof User>
}
