import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'manager_reviews'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('version_label').nullable().after('version_id')
      table.dateTime('practitioner_notified_at').nullable().after('version_label')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('practitioner_notified_at')
      table.dropColumn('version_label')
    })
  }
}
