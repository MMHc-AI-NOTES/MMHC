import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CountNotes extends BaseCommand {
  static commandName = 'notes:count'

  static description = 'Count total notes and unique note_ids in session table'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const [totalResult] = await db
      .from('session')
      .whereNull('deleted_at')
      .count('* as count')
    const total = Number((totalResult as any).count)

    const [uniqueResult] = await db.rawQuery(
      'SELECT COUNT(DISTINCT note_id) as count FROM session WHERE deleted_at IS NULL'
    )
    const unique = Number((uniqueResult as any)[0]?.count ?? 0)

    const dupesResult = await db.rawQuery(
      'SELECT note_id, COUNT(*) as cnt FROM session WHERE deleted_at IS NULL GROUP BY note_id HAVING COUNT(*) > 1'
    )
    const dupes = (dupesResult as any)[0] || []

    this.logger.info(`Total notes (rows): ${total}`)
    this.logger.info(`Unique note_ids: ${unique}`)
    this.logger.info(`Duplicate note_ids (count): ${dupes.length}`)
    if (dupes.length > 0) {
      this.logger.info('Sample duplicates:')
      dupes.slice(0, 5).forEach((r: any) => {
        this.logger.info(`  ${r.note_id} -> ${r.cnt} rows`)
      })
    }

    process.exit(0)
  }
}
