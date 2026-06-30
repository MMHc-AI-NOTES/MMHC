import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  protected tableName = 'feedback_verdicts'

  async up() {
    try {
      await db.rawQuery(`
        ALTER TABLE feedback_verdicts
        DROP INDEX feedback_verdicts_note_id_section_description_id_side_by_unique
      `)
    } catch {
      // Index may already be dropped from a prior partial migration run.
    }

    try {
      await db.rawQuery(`
        ALTER TABLE feedback_verdicts
        CHANGE COLUMN \`by\` verdict_by VARCHAR(150) NOT NULL
      `)
    } catch {
      // Column may already be renamed.
    }

    await db.rawQuery(`
      ALTER TABLE feedback_verdicts
      MODIFY COLUMN description_id VARCHAR(100) NOT NULL DEFAULT '',
      MODIFY COLUMN code VARCHAR(100) NULL
    `)

    try {
      await db.rawQuery(`
        CREATE UNIQUE INDEX feedback_verdict_upsert_uq
        ON feedback_verdicts (note_id, section, description_id, side, verdict_by)
      `)
    } catch {
      // Index may already exist.
    }
  }

  async down() {
    try {
      await db.rawQuery(`DROP INDEX feedback_verdict_upsert_uq ON feedback_verdicts`)
    } catch {
      // ignore
    }

    await db.rawQuery(`
      ALTER TABLE feedback_verdicts
      CHANGE COLUMN verdict_by \`by\` VARCHAR(150) NOT NULL
    `)

    await db.rawQuery(`
      ALTER TABLE feedback_verdicts
      MODIFY COLUMN description_id VARCHAR(50) NOT NULL DEFAULT '',
      MODIFY COLUMN code VARCHAR(50) NULL
    `)

    try {
      await db.rawQuery(`
        CREATE UNIQUE INDEX feedback_verdicts_note_id_section_description_id_side_by_unique
        ON feedback_verdicts (note_id, section, description_id, side, \`by\`)
      `)
    } catch {
      // ignore
    }
  }
}
