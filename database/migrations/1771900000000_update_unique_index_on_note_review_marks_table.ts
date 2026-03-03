import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'note_review_marks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['note_id', 'reviewer_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['note_id', 'reviewer_id'])
    })
  }
}
