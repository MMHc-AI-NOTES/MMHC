import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'manager_reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .bigInteger('manager_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()
      table
        .integer('review_id')
        .unsigned()
        .references('id')
        .inTable('human_reviews')
        .onDelete('CASCADE')
        .notNullable()
      table.string('note_id').notNullable()
      table.index('note_id')
      table
        .integer('chat_id')
        .unsigned()
        .references('id')
        .inTable('chats')
        .onDelete('SET NULL')
        .nullable()
      table.integer('decision').notNullable()
      table
        .bigInteger('practitioner_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()
      table.integer('manual_score').nullable()
      table.integer('ai_score').nullable()
      table.integer('disagreement').nullable()
      table.text('comment').nullable()
      table.integer('ai_status').nullable()
      table.integer('priority').nullable()
      table.integer('human_result').nullable()
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
