import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sme_issues_tamplate'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('description_id', 50).nullable().unique()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('description_id')
    })
  }
}
