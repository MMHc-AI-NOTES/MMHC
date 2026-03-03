import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'manager_reviews'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('version_label').nullable().after('version_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('version_label')
    })
  }
}
