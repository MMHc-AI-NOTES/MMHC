import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'session_table'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('cpt_code_id')
        .unsigned()
        .references('id')
        .inTable('cpt_codes')
        .onDelete('SET NULL')
        .nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('cpt_code_id')
    })
  }
}
