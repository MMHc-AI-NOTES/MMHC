import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sme_issues_tamplate'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('error_type_id')
        .unsigned()
        .references('id')
        .inTable('error_types')
        .onDelete('RESTRICT')
        .notNullable()

      table
        .integer('issues_related_to_id')
        .unsigned()
        .references('id')
        .inTable('issues_related_to')
        .onDelete('RESTRICT')
        .notNullable()

      table
        .integer('issue_description_id')
        .unsigned()
        .references('id')
        .inTable('issue_descriptions')
        .onDelete('RESTRICT')
        .nullable()

      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
