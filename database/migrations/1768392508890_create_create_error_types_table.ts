import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'error_types'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable().unique() // minor, moderate, critical
      table.string('display_name').notNullable() // Minor (-5 pts), Moderate (-15 pts), Critical (-25 pts)
      table.integer('points').notNullable() // 5, 15, 25
      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable().defaultTo(null)

      table.index('name')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
