import { BaseSchema } from '@adonisjs/lucid/schema'
import { HumanReviewDecisionEnum } from '#enums/human_review_enum'

export default class extends BaseSchema {
  protected tableName = 'human_reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('decision')
        .notNullable()
        .defaultTo(HumanReviewDecisionEnum.accept_ai_evaluation)
      table.string('note_id').notNullable()
      table
        .bigInteger('practitioner_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .notNullable()
      table.float('manual_score').nullable()
      table.text('comment').nullable()
      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable().defaultTo(null)

      // Indexes
      table.index('note_id')
      table.index('practitioner_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
