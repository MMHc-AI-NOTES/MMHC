import { BaseSchema } from '@adonisjs/lucid/schema'
import HumanReview from '#models/human_review'

export default class extends BaseSchema {
  protected tableName = HumanReview.table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
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
      table.dropForeign(['reviewer_id'])
      table.dropColumn('reviewer_id')
    })
  }
}
