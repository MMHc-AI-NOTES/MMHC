import { BaseSchema } from '@adonisjs/lucid/schema'
import ManagerReview from '#models/manager_review'

export default class extends BaseSchema {
  protected tableName = ManagerReview.table

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

      table
        .bigInteger('reviewer_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .nullable()
        .after('practitioner_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['version_id'])
      table.dropColumn('version_id')
      table.dropForeign(['reviewer_id'])
      table.dropColumn('reviewer_id')
    })
  }
}
