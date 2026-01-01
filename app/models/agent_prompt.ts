// app/models/agent_prompt.ts
import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Agent from '#models/agent'

export default class AgentPrompt extends BaseModel {
  static table = 'agent_prompts'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare agentId: number

  @column()
  declare key: string

  @column()
  declare prompt: string

  @column()
  declare modelId: string

  @column()
  declare temperature: number

  @column()
  declare topP: number | null

  @column()
  declare topK: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Agent)
  declare agent: BelongsTo<typeof Agent>
}
