import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('frequency_penalty', 'presence_penalty')
      table.float('top_p').nullable().after('temperature')
      table.integer('top_k').nullable().after('top_p')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('frequency_penalty').defaultTo(1).after('temperature')
      table.float('presence_penalty').defaultTo(1).after('frequency_penalty')
      table.dropColumns('top_p', 'top_k')
    })
  }
}
