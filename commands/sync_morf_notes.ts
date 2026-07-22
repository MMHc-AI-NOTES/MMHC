import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Morf from '#models/morf'
import Session from '#models/session'
import Patient from '#models/patient'
import User from '#models/user'
import CptCode from '#models/cpt_code'
import WebhookSessionVersion from '#models/webhook_session_version'
import {
  AiStatusEnum,
  HumanReviewEnum,
  ManagerEnum,
  WorkflowEnum,
  PriorityEnum,
} from '#enums/session_enum'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'
import { DateTime } from 'luxon'
import {
  resolveSessionType,
  buildSessionObject,
  type ResolvedSessionType,
} from '#services/note_type_mapping_service'

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

function buildSessionStringFromQuestions(data: any, sessionType?: number): string {
  const questions = data?.Questions ?? data?.questions ?? []
  return JSON.stringify(buildSessionObject(questions, sessionType))
}

function resolveNoteTypeFromMorfData(data: any, noteId: string): ResolvedSessionType {
  // NoteName carries PracticeQ's real note-type label; Type/type are fallbacks.
  const typeValue = data?.NoteName ?? data?.noteName ?? data?.Type ?? data?.type
  return resolveSessionType(typeValue, noteId)
}

export default class SyncMorfNotes extends BaseCommand {
  static commandName = 'morf:sync-notes'

  static description =
    'Get morf_data, group notes by client, sort by time; insert sessions with parent_note_id chain (oldest first, latest = current)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { relinkPatientSessions } = await import('#services/webhook_service')
    const rows = await Morf.query().where('is_processed', false).orderBy('id', 'asc')
    this.logger.info(`Found ${rows.length} unprocessed rows in morf_data`)
    const cptCode = await CptCode.findBy('code', '90791')
    if (!cptCode) {
      this.logger.error('CPT code 90791 not found. Run CPT code seeder first.')
      process.exit(1)
    }
    // Group by patient; preserve order of first occurrence (first client in data = first processed)
    const byPatient = new Map<
      string,
      { morf: Morf; data: any; noteId: string; timeMs: number; patientId: number | null }[]
    >()
    const patientOrder: string[] = []
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
      if (!byPatient.has(key)) {
        byPatient.set(key, [])
        patientOrder.push(key)
      }
      byPatient.get(key)!.push({ morf: row, data, noteId, timeMs, patientId })
    }
    this.logger.info(`Grouped into ${byPatient.size} patients`)
    // Process in order of first occurrence: first client's notes get ids 1,2,3… then next client
    const sortedPatients = patientOrder.map((key) => [key, byPatient.get(key)!] as const)
    let created = 0
    let updated = 0
    let skipped = 0
    let errors = 0
    for (const [pidStr, notes] of sortedPatients) {
      const patientId = Number(pidStr)
      const patient = await Patient.find(patientId)
      if (!patient) {
        this.logger.warning(`Patient id=${patientId}: not found, skipping ${notes.length} notes`)
        skipped += notes.length
        continue
      }
      // Sort notes by session_time ascending (oldest first): note 1, then 2, then 3...
      // parent_note_id chain for this patient will be recomputed globally (see relinkPatientSessions).
      notes.sort((a, b) => a.timeMs - b.timeMs)
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
          const resolvedType = resolveNoteTypeFromMorfData(data, noteId)
          const noteType = resolvedType.type
          const sessionString = buildSessionStringFromQuestions(
            data,
            resolvedType.matched ? noteType : undefined
          )
          const sessionId = `session-${noteId.substring(0, 8)}`
          const sessionTime = data.Date
            ? DateTime.fromISO(data.Date, { setZone: true })
            : morf.createdAt
          // Always create/update with parent_note_id = null; full chain is built later via relinkPatientSessions
          const parentNoteId: number | null = null
          const existing = await Session.query()
            .where('note_id', noteId)
            .orWhere('session_id', sessionId)
            .first()
          let currentSession: Session
          if (existing) {
            existing.session = sessionString
            existing.sessionTime = sessionTime.isValid ? sessionTime : morf.createdAt
            existing.practitionerId = practitionerId
            existing.patientId = patient.id
            existing.parentNoteId = parentNoteId
            existing.type = noteType
            await existing.save()
            currentSession = existing
            updated++
          } else {
            currentSession = await Session.create({
              noteId,
              sessionId,
              session: sessionString,
              sessionTime: sessionTime.isValid ? sessionTime : morf.createdAt,
              practitionerId,
              patientId: patient.id,
              type: noteType,
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
            created++
          }
          // Ensure default version exists for this note (for version listing)
          const hasVersion = await WebhookSessionVersion.query()
            .where('note_id', currentSession.noteId)
            .first()
          if (!hasVersion) {
            await WebhookSessionVersion.create({
              noteId: currentSession.noteId,
              sessionJson: currentSession.session || '{}',
            })
          }
          morf.isProcessed = true
          await morf.save()
        } catch (err: any) {
          errors++
          this.logger.error(`Row id=${morf.id} noteId=${noteId}: ${err.message}`)
        }
      }
      // Rebuild parent-child chain for this patient's sessions based on sessionTime
      await relinkPatientSessions(patient.id)
    }
    this.logger.success(
      `Done. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`
    )
    process.exit(0)
  }
}
