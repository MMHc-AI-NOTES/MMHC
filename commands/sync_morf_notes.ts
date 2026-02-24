import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Morf from '#models/morf'
import Session from '#models/session'
import Patient from '#models/patient'
import User from '#models/user'
import CptCode from '#models/cpt_code'
import {
  SessionTypeEnum,
  AiStatusEnum,
  HumanReviewEnum,
  ManagerEnum,
  WorkflowEnum,
  PriorityEnum,
} from '#enums/session_enum'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'
import { DateTime } from 'luxon'

const FIELD_MAPPING: Record<string, string> = {
  'p9m9-1': 'Session Duration',
  '1hye-1': 'Mental Status (optional)',
  'kxgx-7': 'Suicidality',
  'kxgx-8': 'Homicidality',
  '6tx9-1': 'Subjective',
  'rb2f-1': 'Objective',
  'zad8-1': 'Assessment & Therapeutic Intervention',
  'ugq6-1': 'Reaction to Intervention',
  'hnfi-1': 'Plan and Collaboration',
  '9z5t-1': 'Therapist Reflection and Insight (optional)',
  'gm4p-1': 'Progress',
  '4lbp-1': 'Therapist Initials',
}

function getSortableTime(data: any, morfCreatedAt: DateTime): number {
  const dateStr = data?.Date ?? data?.date ?? data?.LastModified ?? data?.last_modified
  if (dateStr && typeof dateStr === 'string') {
    const parsed = DateTime.fromISO(dateStr, { setZone: true })
    if (parsed.isValid) return parsed.toMillis()
  }
  const et = data?.EventTimestamp ?? data?.EventTime
  if (et && typeof et === 'object' && typeof et.seconds === 'number') {
    return et.seconds * 1000 + (et.nanoseconds ?? 0) / 1e6
  }
  return morfCreatedAt.toMillis()
}

function buildSessionStringFromQuestions(data: any): string {
  const questions = data?.Questions ?? data?.questions ?? []
  if (!Array.isArray(questions)) return JSON.stringify({})
  const sessionObject: Record<string, string> = {}
  for (const q of questions) {
    const id = q?.id ?? q?.Id
    const text = q?.text ?? q?.Text
    const answer = q?.answer ?? q?.Answer ?? ''
    const fieldName = FIELD_MAPPING[id] || text
    if (fieldName) sessionObject[fieldName] = answer ?? ''
  }
  return JSON.stringify(sessionObject)
}

export default class SyncMorfNotes extends BaseCommand {
  static commandName = 'morf:sync-notes'

  static description =
    'Get morf_data, group notes by client, sort by time; insert sessions with parent_note_id chain (oldest first, latest = current)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const rows = await Morf.query().where('is_processed', false).orderBy('id', 'asc')
    this.logger.info(`Found ${rows.length} unprocessed rows in morf_data`)

    const cptCode = await CptCode.findBy('code', '90791')
    if (!cptCode) {
      this.logger.error('CPT code 90791 not found. Run CPT code seeder first.')
      process.exit(1)
    }

    // Group by patient (patient_id or client_id)
    const byPatient = new Map<
      string,
      { morf: Morf; data: any; noteId: string; timeMs: number; patientId: number | null }[]
    >()

    for (const row of rows) {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      if (!data || typeof data !== 'object') {
        this.logger.warning(`Row id=${row.id}: invalid data, skipping`)
        continue
      }
      const patientIdRaw = data.PatientId ?? data.patient_id ?? data.patientId ?? null
      const clientId = data.ClientId ?? data.client_id ?? data.clientId ?? data.ClientID ?? null

      let patientId: number | null = null
      if (
        patientIdRaw !== null &&
        patientIdRaw !== undefined &&
        String(patientIdRaw).trim() !== ''
      ) {
        const p = await Patient.query().where('id', Number(patientIdRaw)).first()
        if (p) patientId = p.id
      }
      if (
        patientId === null &&
        clientId !== null &&
        clientId !== undefined &&
        String(clientId).trim() !== ''
      ) {
        const p = await Patient.query().where('client_id', String(clientId).trim()).first()
        if (p) patientId = p.id
      }
      if (patientId === null) {
        this.logger.warning(`Row id=${row.id}: no PatientId or ClientId, skipping`)
        continue
      }
      const key = String(patientId)
      const noteId = (row.noteId || data.NoteId) ?? data.noteId ?? ''
      if (!noteId) {
        this.logger.warning(`Row id=${row.id}: no NoteId, skipping`)
        continue
      }
      const timeMs = getSortableTime(data, row.createdAt)
      if (!byPatient.has(key)) byPatient.set(key, [])
      byPatient.get(key)!.push({ morf: row, data, noteId, timeMs, patientId })
    }

    this.logger.info(`Grouped into ${byPatient.size} patients`)

    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const [pidStr, notes] of byPatient) {
      const patientId = Number(pidStr)
      const patient = await Patient.find(patientId)
      if (!patient) {
        this.logger.warning(`Patient id=${patientId}: not found, skipping ${notes.length} notes`)
        skipped += notes.length
        continue
      }

      // Sort by time descending (latest first) – latest = current note, store first with parent null; then older notes with parent_note_id = previously created id
      notes.sort((a, b) => b.timeMs - a.timeMs)

      let lastSession: Session | null = null

      for (const { morf, data, noteId } of notes) {
        try {
          const practitionerIdRaw =
            data.PractitionerId ?? data.practitioner_id ?? data.practitionerId ?? null
          let practitionerId: number | null = null
          if (
            practitionerIdRaw !== null &&
            practitionerIdRaw !== undefined &&
            String(practitionerIdRaw).trim() !== ''
          ) {
            const u = await User.query().where('pq_id', String(practitionerIdRaw).trim()).first()
            if (u) practitionerId = u.id
          }
          if (practitionerId === null) {
            const byEmail = data.PractitionerEmail ?? data.practitioner_email ?? data.Email
            if (byEmail) {
              const u = await User.query().where('email', String(byEmail).trim()).first()
              if (u) practitionerId = u.id
            }
          }
          if (practitionerId === null) practitionerId = 1

          const sessionString = buildSessionStringFromQuestions(data)
          const sessionId = `session-${noteId.substring(0, 8)}`
          const sessionTime = data.Date
            ? DateTime.fromISO(data.Date, { setZone: true })
            : morf.createdAt
          const parentNoteId: number | null = lastSession ? lastSession.id : null

          const existing = await Session.query()
            .where('note_id', noteId)
            .orWhere('session_id', sessionId)
            .first()

          if (existing) {
            existing.session = sessionString
            existing.sessionTime = sessionTime.isValid ? sessionTime : morf.createdAt
            existing.practitionerId = practitionerId
            existing.patientId = patient.id
            existing.parentNoteId = parentNoteId
            await existing.save()
            lastSession = existing
            updated++
          } else {
            const session: Session = await Session.create({
              noteId,
              sessionId,
              session: sessionString,
              sessionTime: sessionTime.isValid ? sessionTime : morf.createdAt,
              practitionerId,
              patientId: patient.id,
              type: SessionTypeEnum.intake,
              cptCodeId: cptCode.id,
              aiScore: null,
              aiStatus: AiStatusEnum.not_reviewed,
              humanReview: HumanReviewEnum.pending,
              manager: ManagerEnum.pending,
              workflow: WorkflowEnum.in_queue,
              priority: PriorityEnum.low,
              reviewCycle: ReviewCycleEnum.cycle_1_of_3,
              parentNoteId,
            })
            lastSession = session
            created++
          }

          morf.isProcessed = true
          await morf.save()
        } catch (err: any) {
          errors++
          this.logger.error(`Row id=${morf.id} noteId=${noteId}: ${err.message}`)
        }
      }
    }

    this.logger.success(
      `Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`
    )
    process.exit(0)
  }
}
