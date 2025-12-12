import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'human_reviews'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('human_result').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('human_result')
    })
  }
}
