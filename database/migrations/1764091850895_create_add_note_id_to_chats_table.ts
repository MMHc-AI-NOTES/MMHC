import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('note_id').notNullable().after('bedrock_response')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('note_id')
    })
  }
}
