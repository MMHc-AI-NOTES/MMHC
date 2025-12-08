import Patient from '#models/patient'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = Patient.table

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').notNullable()
      table.string('uuid').nullable()
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
