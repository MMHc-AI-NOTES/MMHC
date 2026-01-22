import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'issues_related_to'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('field_id').notNullable().unique() // p9m9-1, 1hye-1, etc.
      table.string('display_name').notNullable() // Session Duration, Mental Status, etc.
      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable().defaultTo(null)

      table.index('field_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
