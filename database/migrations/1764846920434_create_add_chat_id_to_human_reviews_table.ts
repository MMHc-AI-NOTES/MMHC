import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'human_reviews'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('chat_id')
        .unsigned()
        .references('id')
        .inTable('chats')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
        .nullable()
        .after('note_id')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['chat_id'])
      table.dropColumn('chat_id')
    })
  }
}
