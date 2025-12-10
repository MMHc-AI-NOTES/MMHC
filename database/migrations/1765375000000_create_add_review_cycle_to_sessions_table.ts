import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'session_table'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('review_cycle').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('review_cycle')
    })
  }
}
