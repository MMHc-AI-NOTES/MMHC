import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Change result column from text to integer
      table.integer('result').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert result column back to text
      table.text('result').nullable().alter()
    })
  }
}
