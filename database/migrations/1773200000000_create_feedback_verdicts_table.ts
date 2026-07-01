import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  protected tableName = 'feedback_verdicts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table
        .integer('session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('session')
        .onDelete('CASCADE')

      table
        .bigInteger('reviewer_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .nullable()

      table
        .integer('sme_issue_template_id')
        .unsigned()
        .references('id')
        .inTable('sme_issues_tamplate')
        .onDelete('SET NULL')
        .nullable()

      table
        .integer('issue_description_id')
        .unsigned()
        .references('id')
        .inTable('issue_descriptions')
        .onDelete('SET NULL')
        .nullable()

      table
        .integer('issues_related_to_id')
        .unsigned()
        .references('id')
        .inTable('issues_related_to')
        .onDelete('SET NULL')
        .nullable()

      table.string('scorer_version', 100).nullable()
      table.timestamp('reviewed_at').notNullable()
      table.string('side', 10).notNullable()
      table.tinyint('verdict').unsigned().notNullable()
      table.text('comment').nullable()
      table.text('adjudication_request').nullable()
      table.text('adjudication_response').nullable()
      table.timestamps(true, true)

      table.index(['session_id'])
      table.index(['reviewer_id'])
      table.index(['sme_issue_template_id'])
      table.index(['issue_description_id'])
      table.index(['issues_related_to_id'])
    })

    this.defer(async () => {
      try {
        await db.rawQuery(`
          CREATE UNIQUE INDEX fb_verdict_uq
          ON feedback_verdicts (session_id, reviewer_id, side, sme_issue_template_id, issue_description_id)
        `)
      } catch {
        // ignore if index already exists
      }
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
