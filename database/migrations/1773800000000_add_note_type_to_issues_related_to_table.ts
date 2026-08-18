import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'issues_related_to'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('note_type', 50).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('note_type')
    })
  }
}
