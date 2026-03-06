import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'note_review_marks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('note_version_id')
        .unsigned()
        .references('id')
        .inTable('webhook_session_versions')
        .onDelete('CASCADE')
        .nullable()
        .after('note_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['note_version_id'])
      table.dropColumn('note_version_id')
    })
  }
}
