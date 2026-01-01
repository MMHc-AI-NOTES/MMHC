import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('bedrock_response', 'longtext').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('bedrock_response').nullable().alter()
    })
  }
}
