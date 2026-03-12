import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('model_type').nullable().after('action')
      table.bigInteger('model_id').unsigned().nullable().after('model_type')
      table.string('note_id', 255).nullable().after('model_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('note_id')
      table.dropColumn('model_id')
      table.dropColumn('model_type')
    })
  }
}
