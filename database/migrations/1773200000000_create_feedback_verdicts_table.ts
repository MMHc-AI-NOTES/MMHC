import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feedback_verdicts'

  async up() {
    this.schema.dropTableIfExists(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('note_id', 100).notNullable()
      table
        .bigInteger('reviewer_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .nullable()
      table.string('scorer_version', 100).nullable()
      table.string('reviewer_name', 150).notNullable()
      table.timestamp('reviewed_at').notNullable()
      table.string('section', 100).notNullable()
      table.string('description_id', 50).notNullable().defaultTo('')
      table.text('description').nullable()
      table.string('code', 50).nullable()
      table.string('side', 10).notNullable()
      table.string('verdict', 10).notNullable()
      table.text('comment').nullable()
      table.string('by', 150).notNullable()
      table.text('adjudication_response').nullable()
      table.timestamps(true, true)

      table.unique(['note_id', 'section', 'description_id', 'side', 'by'])
      table.index('note_id')
      table.index('reviewer_id')
      table.index(['note_id', 'reviewer_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
