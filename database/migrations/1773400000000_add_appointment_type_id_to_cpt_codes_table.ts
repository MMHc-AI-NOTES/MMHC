import { BaseSchema } from '@adonisjs/lucid/schema'
import CptCode from '#models/cpt_code'

export default class extends BaseSchema {
  protected tableName = CptCode.table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['code'])
      table.string('appointment_type_id', 100).nullable().after('code')
      table.unique(['appointment_type_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['appointment_type_id'])
      table.dropColumn('appointment_type_id')
      table.unique(['code'])
    })
  }
}
