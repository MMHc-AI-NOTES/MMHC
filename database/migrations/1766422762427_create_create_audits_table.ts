import { BaseSchema } from '@adonisjs/lucid/schema'
import Audit from '#models/audit'

export default class extends BaseSchema {
  protected tableName = Audit.table

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.text('user_type').nullable()
      table
        .bigInteger('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('event').notNullable()
      table.text('auditable_type').notNullable()
      table.integer('auditable_id').notNullable()
      table.text('old_values').nullable()
      table.text('new_values').nullable()
      table.text('metadata').nullable()
      table.string('note_id').nullable()
      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
