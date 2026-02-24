import { BaseSchema } from '@adonisjs/lucid/schema'
import User from '#models/user'

export default class extends BaseSchema {
  protected tableName = User.table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('pq_id', 255).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pq_id')
    })
  }
}
