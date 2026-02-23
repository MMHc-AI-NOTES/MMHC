import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'note_review_marks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('note_id', 255).notNullable()
      table
        .bigInteger('reviewer_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()
      table.boolean('marked_as_reviewed').notNullable().defaultTo(false)
      table.timestamp('marked_at').nullable()
      table.timestamps(true, true)

      table.unique(['note_id', 'reviewer_id'])
      table.index('note_id')
      table.index('reviewer_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
