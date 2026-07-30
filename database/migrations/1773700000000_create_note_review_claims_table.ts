import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'note_review_claims'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // A short lived claim taken for the duration of one AI review.
      //
      // The sweep runs in the worker process and the Re-run Audit button runs
      // in the API process, so an in memory guard cannot see both. The unique
      // constraint here is the only thing that stops the same note being scored
      // twice at once, which would leave two chats rows for one note. Reads use
      // Chat.query().where('note_id', ...).first(), so the second row would be
      // invisible while still inflating the manager review chat count.
      table.string('note_id').notNullable().unique()

      // Which process holds it, so a release cannot free someone else's claim.
      table.string('claimed_by').notNullable()
      table.timestamp('claimed_at').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Stale claims left behind by a crashed worker are reclaimed by age.
      table.index('claimed_at', 'idx_nrc_claimed_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
