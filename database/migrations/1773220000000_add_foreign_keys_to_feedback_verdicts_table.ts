import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSchema {
  protected tableName = 'feedback_verdicts'

  async up() {
    try {
      await db.rawQuery(`DROP INDEX feedback_verdict_upsert_uq ON feedback_verdicts`)
    } catch {
      // ignore
    }

    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('session_id')
        .unsigned()
        .references('id')
        .inTable('session')
        .onDelete('CASCADE')
        .nullable()
        .after('note_id')

      table
        .integer('sme_issue_template_id')
        .unsigned()
        .references('id')
        .inTable('sme_issues_tamplate')
        .onDelete('SET NULL')
        .nullable()
        .after('reviewer_id')

      table
        .integer('issue_description_id')
        .unsigned()
        .references('id')
        .inTable('issue_descriptions')
        .onDelete('SET NULL')
        .nullable()
        .after('sme_issue_template_id')

      table
        .integer('issues_related_to_id')
        .unsigned()
        .references('id')
        .inTable('issues_related_to')
        .onDelete('SET NULL')
        .nullable()
        .after('issue_description_id')
    })

    this.defer(async () => {
      await db.rawQuery(`
        UPDATE feedback_verdicts fv
        INNER JOIN session s ON s.note_id = fv.note_id AND s.deleted_at IS NULL
        SET fv.session_id = s.id
        WHERE fv.session_id IS NULL
      `)

      await db.rawQuery(`
        UPDATE feedback_verdicts fv
        INNER JOIN sme_issues_tamplate t ON t.description_id = fv.description_id AND t.deleted_at IS NULL
        SET
          fv.sme_issue_template_id = t.id,
          fv.issue_description_id = t.issue_description_id,
          fv.issues_related_to_id = t.issues_related_to_id
        WHERE fv.description_id IS NOT NULL AND fv.description_id != ''
      `)

      await db.rawQuery(`
        UPDATE feedback_verdicts fv
        INNER JOIN issue_descriptions idesc ON idesc.description = fv.description AND idesc.deleted_at IS NULL
        SET fv.issue_description_id = idesc.id
        WHERE fv.issue_description_id IS NULL AND fv.description IS NOT NULL AND fv.description != ''
      `)

      await db.rawQuery(`
        UPDATE feedback_verdicts fv
        INNER JOIN issues_related_to irt ON irt.display_name = fv.section AND irt.deleted_at IS NULL
        SET fv.issues_related_to_id = irt.id
        WHERE fv.issues_related_to_id IS NULL AND fv.section IS NOT NULL AND fv.section != ''
      `)
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('reviewer_name')
      table.dropColumn('section')
      table.dropColumn('description_id')
      table.dropColumn('description')
      table.dropColumn('code')
      table.dropColumn('verdict_by')
    })

    this.defer(async () => {
      try {
        await db.rawQuery(`
          CREATE UNIQUE INDEX fb_verdict_uq
          ON feedback_verdicts (session_id, reviewer_id, side, sme_issue_template_id, issue_description_id)
        `)
      } catch {
        // ignore if exists
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.index(['session_id'])
      table.index(['sme_issue_template_id'])
      table.index(['issue_description_id'])
      table.index(['issues_related_to_id'])
    })
  }

  async down() {
    try {
      await db.rawQuery(`DROP INDEX fb_verdict_uq ON feedback_verdicts`)
    } catch {
      // ignore
    }

    this.schema.alterTable(this.tableName, (table) => {
      table.string('reviewer_name', 150).notNullable().defaultTo('')
      table.string('section', 100).notNullable().defaultTo('')
      table.string('description_id', 100).notNullable().defaultTo('')
      table.text('description').nullable()
      table.string('code', 100).nullable()
      table.string('verdict_by', 150).notNullable().defaultTo('')
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['session_id'])
      table.dropForeign(['sme_issue_template_id'])
      table.dropForeign(['issue_description_id'])
      table.dropForeign(['issues_related_to_id'])
      table.dropColumn('session_id')
      table.dropColumn('sme_issue_template_id')
      table.dropColumn('issue_description_id')
      table.dropColumn('issues_related_to_id')
    })

    this.defer(async () => {
      try {
        await db.rawQuery(`
          CREATE UNIQUE INDEX feedback_verdict_upsert_uq
          ON feedback_verdicts (note_id, section, description_id, side, verdict_by)
        `)
      } catch {
        // ignore
      }
    })
  }
}
