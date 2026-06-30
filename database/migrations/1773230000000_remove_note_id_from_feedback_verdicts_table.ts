import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  protected tableName = 'feedback_verdicts'

  async up() {
    await db.rawQuery(`
      UPDATE feedback_verdicts fv
      INNER JOIN session s ON s.note_id = fv.note_id AND s.deleted_at IS NULL
      SET fv.session_id = s.id
      WHERE fv.session_id IS NULL
    `)

    try {
      await db.rawQuery(`DROP INDEX feedback_verdicts_note_id_index ON feedback_verdicts`)
    } catch {
      // ignore
    }

    try {
      await db.rawQuery(
        `DROP INDEX feedback_verdicts_note_id_reviewer_id_index ON feedback_verdicts`
      )
    } catch {
      // ignore
    }

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('note_id')
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.integer('session_id').unsigned().notNullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('note_id', 100).nullable().after('id')
    })

    this.defer(async () => {
      await db.rawQuery(`
        UPDATE feedback_verdicts fv
        INNER JOIN session s ON s.id = fv.session_id
        SET fv.note_id = s.note_id
        WHERE fv.note_id IS NULL
      `)
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.integer('session_id').unsigned().nullable().alter()
      table.index(['note_id'])
      table.index(['note_id', 'reviewer_id'])
    })
  }
}
