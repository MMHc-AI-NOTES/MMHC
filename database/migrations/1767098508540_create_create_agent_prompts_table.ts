import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agent_prompts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('agent_id')
        .unsigned()
        .references('id')
        .inTable('agents')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
        .notNullable()
      table.string('key').notNullable()
      table.text('prompt').notNullable()
      table.string('model_id').notNullable()
      table.float('temperature').defaultTo(0.3)
      table.float('top_p').nullable()
      table.integer('top_k').nullable()
      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.index('agent_id')
      // Ensure unique combination of agent_id and key
      table.unique(['agent_id', 'key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
