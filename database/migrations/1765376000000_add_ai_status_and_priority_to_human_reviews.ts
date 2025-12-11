import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'human_reviews'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('ai_status').nullable()
      table.integer('priority').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ai_status')
      table.dropColumn('priority')
    })
  }
}
