import { BaseSchema } from '@adonisjs/lucid/schema'
import Agent from '#models/agent'

export default class extends BaseSchema {
  protected tableName = Agent.table

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.string('model').notNullable()
      table.boolean('use_context').defaultTo(false)
      table.float('temperature').defaultTo(1)
      table.float('frequency_penalty').defaultTo(1)
      table.float('presence_penalty').defaultTo(1)
      table.string('previous_section').nullable()
      table.boolean('transcript').defaultTo(false)
      table.text('prompt').nullable()
      table.text('description').nullable()
      table.string('agent_key')
      table.boolean('is_active').defaultTo(true)
      table.boolean('is_default').defaultTo(false)
      table.integer('type').defaultTo(3)
      table.json('ai_safety_settings').nullable()

      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
