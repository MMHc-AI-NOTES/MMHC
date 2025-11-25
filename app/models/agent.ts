import { DateTime } from 'luxon'
import { BaseModel, beforeFetch, beforeFind, column } from '@adonisjs/lucid/orm'
import { softDeleteQuery } from '#helpers/soft_delete_helper'

export const SORT_AGENT_ENUM = ['id', 'name']
export const FILTER_AGENT_ENUM = ['id', 'name']

export default class Agent extends BaseModel {
  static table = 'agents'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare agentKey: string | null

  @column()
  declare model: string

  @column({ consume: (value) => value ?? false })
  declare useContext: boolean

  @column()
  declare temperature: number

  @column()
  declare frequencyPenalty: number

  @column()
  declare presencePenalty: number

  @column()
  declare previousSection: string | null

  @column()
  declare description: string | null

  @column({ consume: (value) => value ?? false })
  declare transcript: boolean

  @column()
  declare prompt: string | null

  @column()
  declare isActive: boolean

  @column()
  declare isDefault: boolean

  @column()
  declare type: number

  @column({
    prepare: (value: any) => (value ? JSON.stringify(value) : null),
    consume: (value: any) => (value ? JSON.parse(value) : null),
  })
  declare aiSafetySettings: object | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @column.dateTime({ serializeAs: null })
  declare deletedAt: DateTime | null

  @beforeFind()
  public static softDeletesFind = softDeleteQuery

  @beforeFetch()
  public static softDeletesFetch = softDeleteQuery

  public async softDelete() {
    const rand = Math.random().toString(36).substring(7)
    const deleteName = this.name
    if (this.deletedAt === null) {
      this.deletedAt = DateTime.now()
      this.name = deleteName.concat('_', rand)
    }
    await this.save()
  }
}
