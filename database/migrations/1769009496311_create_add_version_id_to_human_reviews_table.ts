import { BaseSchema } from '@adonisjs/lucid/schema'
import HumanReview from '#models/human_review'

export default class extends BaseSchema {
  protected tableName = HumanReview.table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('version_id')
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
      table.dropForeign(['version_id'])
      table.dropColumn('version_id')
    })
  }
}
