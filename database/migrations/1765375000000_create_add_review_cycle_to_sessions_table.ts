import { BaseSchema } from '@adonisjs/lucid/schema'
import Session from '#models/session'

export default class extends BaseSchema {
  protected tableName = Session.table

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
