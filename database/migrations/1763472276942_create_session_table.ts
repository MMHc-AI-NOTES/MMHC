import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'session_table'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.uuid('note_id').notNullable()
      table.string('session_id').notNullable()
      table.text('session').notNullable()
      table.timestamp('session_time').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .bigInteger('practitioner_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .bigInteger('patient_id')
        .unsigned()
        .references('id')
        .inTable('patients')
        .onDelete('CASCADE')
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
