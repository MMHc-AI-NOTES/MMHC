import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { AuditActionEnum } from '#enums/audit_log_enum'
import { resolveSessionType, buildSessionObject } from '#services/note_type_mapping_service'

/**
 * Rebuilds the stored session field names from each note's original payload.
 *
 * Field names are resolved once at ingestion, so a note taken in before a
 * mapping existed keeps its old keys. A treatment plan shows headings such as
 * "Treatment Goal  #1\nInstructions: ..." until it is rebuilt.
 *
 * Reads only the raw payload kept in audit_logs, so nothing is re invented.
 * Reports by default and writes only with --apply.
 */
export default class RebuildSessionFields extends BaseCommand {
  static commandName = 'session:rebuild-fields'
  static description = 'Rebuild stored session field names from the original webhook payload'

  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Write the changes. Without it the command only reports.' })
  declare apply: boolean

  @flags.number({
    description: 'Only this session type. 1 progress, 2 intake, 3 plan, 4 termination',
  })
  declare type?: number

  @flags.string({ description: 'Only this note id' })
  declare noteId?: string

  @flags.number({ description: 'Maximum notes to process' })
  declare limit?: number

  async run() {
    const limit = this.limit ?? 500

    const query = db.from('session').whereNull('deleted_at').select('id', 'note_id', 'type')
    if (this.type) query.where('type', this.type)
    if (this.noteId) query.where('note_id', this.noteId)

    const sessions = await query.orderBy('id', 'asc').limit(limit)

    if (!sessions.length) {
      this.logger.info('No sessions matched')
      return
    }

    this.logger.info(
      `${sessions.length} note(s) to inspect${this.apply ? '' : '. Reporting only, pass --apply to write'}`
    )

    let changed = 0
    let unchanged = 0
    let noPayload = 0

    for (const session of sessions) {
      const audit = await db
        .from('audit_logs')
        .where('note_id', session.note_id)
        .where('action', AuditActionEnum.webhookSessionReceived)
        .whereNotNull('metadata')
        .orderBy('id', 'desc')
        .select('metadata')
        .first()

      const metadata =
        typeof audit?.metadata === 'string' ? JSON.parse(audit.metadata) : audit?.metadata
      const payload = metadata?.raw_payload

      if (!payload?.Questions?.length) {
        noPayload++
        continue
      }

      const resolved = resolveSessionType(
        payload.NoteName ?? payload.noteName ?? payload.Type ?? payload.type,
        session.note_id
      )
      const rebuilt = buildSessionObject(
        payload.Questions,
        resolved.matched ? resolved.type : undefined
      )

      if (!Object.keys(rebuilt).length) {
        noPayload++
        continue
      }

      const current = await db.from('session').where('id', session.id).select('session').first()

      const rebuiltJson = JSON.stringify(rebuilt)
      if (current?.session === rebuiltJson) {
        unchanged++
        continue
      }

      changed++
      const before = Object.keys(JSON.parse(current?.session ?? '{}'))
      const after = Object.keys(rebuilt)
      const renamed = after.filter((key) => !before.includes(key))

      this.logger.info(
        `${session.note_id} type ${session.type}: ${renamed.length} field name(s) change` +
          (renamed.length ? `, e.g. ${renamed.slice(0, 3).join(' | ')}` : '')
      )

      if (this.apply) {
        await db.from('session').where('id', session.id).update({ session: rebuiltJson })
        await db
          .from('webhook_session_versions')
          .where('note_id', session.note_id)
          .whereNull('deleted_at')
          .update({ session_json: rebuiltJson })
      }
    }

    this.logger.info(
      `Done. ${changed} to change, ${unchanged} already correct, ${noPayload} without a usable payload`
    )
    if (changed && !this.apply) this.logger.info('Re run with --apply to write these')
  }
}
