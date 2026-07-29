import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'note_review_marks'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // The SME reviewer counts endpoint filters on marked_as_reviewed, then on
      // marked_at for the today/this_week timeframes. Without this it scans the
      // whole table on every call, and the counter card polls it every few
      // seconds per open page.
      // reviewer_id is already indexed (note_review_marks_reviewer_id_index),
      // so the group by is covered.
      table.index(['marked_as_reviewed', 'marked_at'], 'idx_nrm_reviewed_marked_at')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['marked_as_reviewed', 'marked_at'], 'idx_nrm_reviewed_marked_at')
    })
  }
}
