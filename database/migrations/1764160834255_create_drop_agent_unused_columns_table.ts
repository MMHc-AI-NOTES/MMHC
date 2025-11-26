import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('use_context')
      table.dropColumn('transcript')
      table.dropColumn('type')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('use_context').defaultTo(false)
      table.boolean('transcript').defaultTo(false)
      table.integer('type').defaultTo(3)
    })
  }
}
