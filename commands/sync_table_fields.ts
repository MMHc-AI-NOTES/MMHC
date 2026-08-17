import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import {
  fetchFullNote,
  extractTableAnswers,
  isPracticeqConfigured,
} from '#services/practiceq_api_service'
import { FIELD_MAPPING_BY_TYPE, normaliseQuestionLabel } from '#services/note_type_mapping_service'

/**
 * Fills in the table fields the PracticeQ webhook drops.
 *
 * Mental Status on the intake and Treatment Goals & Objectives on the
 * termination note are tables on the form. The webhook sends those questions
 * with no answer, so the stored session has no value for them. This fetches
 * the full note from the PracticeQ API, which does return table content, and
 * merges it into the stored session under the field names already in use.
 *
 * Only fields the session does not already have a value for are written, so
 * webhook data is never overwritten. Reports by default, writes with --apply.
 */
export default class SyncTableFields extends BaseCommand {
  static commandName = 'practiceq:sync-table-fields'
  static description = 'Fetch table field answers from the PracticeQ API and merge them in'

  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Write the changes. Without it the command only reports.' })
  declare apply: boolean

  @flags.string({ description: 'Only this note id' })
  declare noteId?: string

  @flags.number({
    description: 'Only this session type. 1 progress, 2 intake, 3 plan, 4 termination',
  })
  declare type?: number

  @flags.number({ description: 'Maximum notes to process' })
  declare limit?: number

  async run() {
    if (!isPracticeqConfigured()) {
      this.logger.error('PRACTICEQ_API_KEY is not configured, nothing to do')
      return
    }

    const query = db
      .from('session')
      .whereNull('deleted_at')
      .select('id', 'note_id', 'type', 'session')
    if (this.noteId) query.where('note_id', this.noteId)
    if (this.type) query.where('type', this.type)

    const sessions = await query.orderBy('id', 'asc').limit(this.limit ?? 200)
    this.logger.info(
      `${sessions.length} note(s) to inspect${this.apply ? '' : '. Reporting only, pass --apply to write'}`
    )

    let updated = 0
    let untouched = 0
    let unavailable = 0

    for (const row of sessions) {
      const fullNote = await fetchFullNote(row.note_id)
      if (!fullNote) {
        unavailable++
        continue
      }

      const tableAnswers = extractTableAnswers(fullNote)
      if (!Object.keys(tableAnswers).length) {
        untouched++
        continue
      }

      const stored: Record<string, string> =
        typeof row.session === 'string' ? JSON.parse(row.session) : (row.session ?? {})
      const idMap = (row.type && FIELD_MAPPING_BY_TYPE[row.type]) || {}

      const added: string[] = []
      for (const [questionId, text] of Object.entries(tableAnswers)) {
        const fieldName = idMap[questionId] || normaliseQuestionLabel(questionId)
        if (!fieldName) continue
        // Webhook data wins. Only fields with no value are filled in.
        if (String(stored[fieldName] ?? '').trim()) continue
        stored[fieldName] = text
        added.push(fieldName)
      }

      if (!added.length) {
        untouched++
        continue
      }

      updated++
      this.logger.info(`${row.note_id} type ${row.type}: filling ${added.join(' | ')}`)

      if (this.apply) {
        const sessionJson = JSON.stringify(stored)
        await db.from('session').where('id', row.id).update({ session: sessionJson })
        await db
          .from('webhook_session_versions')
          .where('note_id', row.note_id)
          .whereNull('deleted_at')
          .update({ session_json: sessionJson })
      }
    }

    this.logger.info(
      `Done. ${updated} note(s) gain table fields, ${untouched} unchanged, ${unavailable} not returned by the API`
    )
    if (updated && !this.apply) this.logger.info('Re run with --apply to write these')
  }
}
