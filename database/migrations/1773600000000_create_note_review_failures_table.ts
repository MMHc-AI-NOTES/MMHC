import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'note_review_failures'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // One row per note that the automatic review could not complete. The
      // sweep finds its work by querying for notes with no chat, so a failed
      // note is retried on the next run. Without this table a note the scorer
      // can never process would sit at the head of every batch forever.
      table.string('note_id').notNullable().unique()
      table.integer('attempts').unsigned().notNullable().defaultTo(0)
      table.text('last_error').nullable()
      table.timestamp('last_attempt_at').nullable()

      // Set once the note has exhausted its attempts. Quarantined notes are
      // skipped by the sweep and surfaced on the queue dashboard for a human
      // to look at.
      table.timestamp('quarantined_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['quarantined_at', 'last_attempt_at'], 'idx_nrf_quarantined_last_attempt')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
