import { BaseSchema } from '@adonisjs/lucid/schema'
import Session from '#models/session'

export default class extends BaseSchema {
  protected tableName = Session.table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('parent_note_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable(this.tableName)
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['parent_note_id'])
      table.dropColumn('parent_note_id')
    })
  }
}
