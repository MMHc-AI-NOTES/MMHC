import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Session from '#models/session'
import CptCode from '#models/cpt_code'
import { fetchAppointmentTypeIdFromBigQuery } from '#services/bigquery_service'

const CHUNK_SIZE = 50

export default class BackfillSessionCptCodes extends BaseCommand {
  static commandName = 'session:backfill-cpt-codes'
  static description =
    'Backfill session.cpt_code_id from BigQuery. Use --note-id for one note, or omit for all notes.'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.string({
    description: 'Backfill a single note_id. If omitted, backfills all sessions.',
  })
  declare noteId: string
  private cptCodeMap = new Map<string, CptCode>()
  private async loadCptCodes() {
    const cptCodes = await CptCode.query()

    this.cptCodeMap = new Map(cptCodes.map((cpt) => [String(cpt.appointmentTypeId), cpt]))

    this.logger.info(`Loaded ${cptCodes.length} CPT codes`)
  }
  private async processSession(session: Session): Promise<boolean> {
    const appointmentTypeId = await fetchAppointmentTypeIdFromBigQuery(session.noteId)

    if (!appointmentTypeId) {
      this.logger.warning(
        `No AppointmentTypeId from BigQuery for note_id=${session.noteId} (session id=${session.id})`
      )
      return false
    }
    const cptCode = this.cptCodeMap.get(String(appointmentTypeId))

    if (!cptCode) {
      this.logger.warning(
        `No cpt_codes row for appointment_type_id=${appointmentTypeId} (note_id=${session.noteId})`
      )
      return false
    }

    session.cptCodeId = cptCode.id
    await session.save()
    this.logger.success(
      `Updated session id=${session.id} note_id=${session.noteId} cpt_code_id=${cptCode.id}`
    )
    return true
  }

  async run() {
    await this.loadCptCodes()
    if (this.noteId?.trim()) {
      await this.runForOneNote(this.noteId.trim())
      return
    }

    await this.runForAllNotes()
  }

  private async runForOneNote(noteId: string) {
    this.logger.info(`Backfilling one note: ${noteId}`)

    const session = await Session.query()
      .select('id', 'note_id', 'cpt_code_id')
      .where('note_id', noteId)
      .first()

    if (!session) {
      this.logger.error(`Session not found for note_id=${noteId}`)
      this.exitCode = 1
      return
    }

    try {
      await this.processSession(session)
      this.logger.success('Backfill finished')
    } catch (error: any) {
      this.logger.error(`Failed note_id=${noteId}: ${error.message}`)
      this.exitCode = 1
    }
  }

  private async runForAllNotes() {
    const total = await Session.query().count('* as total')
    const totalCount = Number(total[0].$extras.total ?? 0)

    this.logger.info(`Backfilling all notes: ${totalCount} session(s) (chunk=${CHUNK_SIZE})`)

    let processed = 0
    let updated = 0
    let failed = 0
    let lastId = 0

    while (true) {
      const sessions = await Session.query()
        .select('id', 'note_id', 'cpt_code_id')
        .where('id', '>', lastId)
        .orderBy('id', 'asc')
        .limit(CHUNK_SIZE)

      if (!sessions.length) {
        break
      }

      this.logger.info(
        `Processing chunk: sessions ${sessions[0].id}–${sessions[sessions.length - 1].id}`
      )

      for (const session of sessions) {
        processed += 1
        lastId = session.id

        try {
          const didUpdate = await this.processSession(session)
          if (didUpdate) updated += 1
        } catch (error: any) {
          failed += 1
          this.logger.error(
            `Failed session id=${session.id} note_id=${session.noteId}: ${error.message}`
          )
        }
      }
    }

    this.logger.success('Backfill finished')
    this.logger.info(JSON.stringify({ processed, updated, failed }, null, 2))

    if (failed > 0) {
      this.exitCode = 1
    }
  }
}
