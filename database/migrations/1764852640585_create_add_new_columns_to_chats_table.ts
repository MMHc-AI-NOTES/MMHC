import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('agent_id')
        .unsigned()
        .references('id')
        .inTable('agents')
        .onUpdate('CASCADE')
        .onDelete('SET NULL')
        .nullable()
        .after('user_id')
      table.integer('severity').nullable()
      table.integer('trigger_source').nullable()
      table.text('result').nullable()
      table.index('agent_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('agent_id')
      table.dropIndex('agent_id')
      table.dropColumn('agent_id')
      table.dropColumn('severity')
      table.dropColumn('trigger_source')
      table.dropColumn('result')
    })
  }
}
