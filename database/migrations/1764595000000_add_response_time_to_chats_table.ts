import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('response_time').nullable()
      table.timestamp('start_time').nullable()
      table.timestamp('end_time').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('response_time')
      table.dropColumn('start_time')
      table.dropColumn('end_time')
    })
  }
}
