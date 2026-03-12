import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .bigInteger('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
      table.string('description').notNullable()
      table.string('action', 100).notNullable()
      table.string('ip_address', 255).notNullable()
      table.string('user_agent', 512).notNullable()
      table.dateTime('action_time').notNullable()
      table.boolean('status').notNullable()
      table.text('metadata').nullable()
      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
