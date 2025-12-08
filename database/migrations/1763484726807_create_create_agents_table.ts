import { BaseSchema } from '@adonisjs/lucid/schema'
import Agent from '#models/agent'

export default class extends BaseSchema {
  protected tableName = Agent.table

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.string('model').notNullable()
      table.float('temperature').defaultTo(1)
      table.float('top_p').nullable().nullable()
      table.integer('top_k').nullable().nullable()
      table.string('previous_section').nullable()
      table.text('prompt').nullable()
      table.text('description').nullable()
      table.string('agent_key')
      table.boolean('is_active').defaultTo(true)
      table.boolean('is_default').defaultTo(false)
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
