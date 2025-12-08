import { BaseSchema } from '@adonisjs/lucid/schema'
import CptCode from '#models/cpt_code'

export default class extends BaseSchema {
  protected tableName = CptCode.table

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('code').notNullable().unique()
      table.string('name').notNullable()
      table.string('description')

      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP')).notNullable()
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
        .notNullable()
      table.timestamp('deleted_at').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
