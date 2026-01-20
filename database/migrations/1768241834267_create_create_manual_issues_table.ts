import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sme_issues'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .bigInteger('reviewer_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .nullable()
      table
        .integer('version_id')
        .unsigned()
        .references('id')
        .inTable('webhook_session_versions')
        .onDelete('CASCADE')
        .nullable()
      table.integer('error_type')
      table.integer('issues_related_to')
      table.text('description')
      table.string('note_id')
      table.integer('status').defaultTo(1)
      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable().defaultTo(null)

      table.index('reviewer_id')
      table.index('note_id')
      table.index('version_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
