import { SessionTypeEnum } from '#enums/session_enum'
import logger from '@adonisjs/core/services/logger'

/**
 * Shared note-type + field-mapping logic used by both live ingestion paths:
 *  - the PracticeQ webhook (app/services/webhook_service.ts)
 *  - the MORF sync command (commands/sync_morf_notes.ts)
 *
 * Background: every note used to be stored as a progress note regardless of
 * what PracticeQ actually sent, because (a) the note-type field on the
 * payload (NoteName / Type) was never read into the session, and (b) the old
 * FIELD_MAPPING only recognized progress-note question ids, so other note
 * types (intake, treatment plan, termination) would end up with an empty or
 * near-empty session body even though PracticeQ sent everything correctly.
 *
 * Field mappings below were built from real sample note structures the
 * client provided (progress note, "Initial Consultation: Intake/Assessment",
 * "Initial Consultation: Assessment/Treatment Plan", and "Termination Note").
 * Two important things came out of comparing those samples:
 *
 *  1. Question ids are NOT globally unique across note types — the same id
 *     can mean different fields in different note types (e.g. `zad8-1` is
 *     "Assessment & Therapeutic Intervention" on a progress note but
 *     "Tenative Goals and Plans" on an intake note). So field-name lookup
 *     must be scoped per note type, never a single flat id -> name map.
 *
 *  2. The treatment-plan template has a dynamic, repeatable goal-block
 *     section (up to 4 goals, each optional) whose question ids were NOT
 *     consistent between the two sample files for the same note type —
 *     they appear to be generated per note instance. Hardcoding ids for
 *     treatment plans would be unreliable, so treatment-plan fields are
 *     captured using PracticeQ's own question `text` label instead of an
 *     id lookup (see buildSessionObject below).
 */

// Progress-note question id -> canonical field name. Unchanged from the
// original implementation — this has already been in production, and other
// stored sessions / the MCP prompt rely on these exact field names, so don't
// rename entries here without a migration plan.
export const FIELD_MAPPING: Record<string, string> = {
  // MORF / legacy
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
  // Progress Note / webhook payload (same input shape)
  'p46w-1': 'First Name:',
  'p46w-2': 'Last Name:',
  'p46w-3': 'Date of Birth:',
  'g39u-1': 'Session Duration',
  'd1zt-1': 'Encounter Type & Method',
  'cupi-1': 'Mental Status (optional)',
  'br4k-1': 'Suicidality',
  'br4k-2': 'Homicidality',
  'ujky-1': 'Subjective',
  'k8nq-1': 'Objective',
  'nbli-1': 'Assessment & Therapeutic Intervention',
  'm5uu-1': 'Reaction to Intervention',
  'u3jf-1': 'Plan and Collaboration',
  'x1gq-1': 'Therapist Reflection and Insight (optional)',
  'cpb1-1': 'Progress',
  'zqpc-1': 'Full Name & Credentials (Signature)',
  'zqpc-2': 'Date Completed',
  '5r6o-1': 'Documented by Supervised Clinician (if applicable)',
}

// Intake ("Initial Consultation: Intake/Assessment") question id -> field
// name, confirmed consistent across both sample files provided.
const INTAKE_FIELD_MAPPING: Record<string, string> = {
  'ot2p-1': 'First Name:',
  'ot2p-3': 'Last Name:',
  'ot2p-4': 'Date of Birth:',
  'ot2p-5': 'Initiation date',
  'fiuw-1': 'Encounter Type & Method',
  'l97s-1': 'Mental Status',
  'h08z-1': 'Presenting Problem & Symptoms',
  't6rq-1': 'Pertinent history as related to presenting problem, trauma, abuse, etc',
  'u6ll-1': 'Bio/Psychosocial Assessment',
  'a8yi-1': 'Family History',
  'kxgx-1': 'Risk Assessment',
  'nv9g-1': 'Strengths',
  'zad8-1': 'Tenative Goals and Plans',
  'qaa1-1': 'Involvement',
  'g6eo-1': 'Cultural Variables?',
  'c5zm-1': 'If yes, please explain explain',
  'jfnz-1': 'Is Client Appropriate For Agency Services?',
  '2xvm-1': 'If no, please explain',
  '9j7d-1': 'Full Name & Credentials (Signature)',
  '9j7d-2': 'Date Completed',
  'a17g-1': 'Documented by Supervised Clinician (if applicable)',
}

// Termination Note question id -> field name, confirmed consistent across
// both sample files provided.
const TERMINATION_FIELD_MAPPING: Record<string, string> = {
  'uap4-1': 'First Name:',
  'uap4-3': 'Last Name:',
  'uap4-4': 'Date of Birth:',
  'uap4-5': 'Initiation Date:',
  'uap4-6': 'Review on',
  'uap4-7': 'days on',
  'amrh-1': 'Encounter Type & Method',
  'fvuz-1': 'Treatment Goals & Objectives:',
  'pqkf-1': 'Progress Overview:',
  'vqnh-1': "Client's Reflections:",
  't24x-1': 'Client Satisfaction Level:',
  'k5h4-1': 'Engagement Level:',
  '101p-1': 'Progress and Growth Areas:',
  'qnhp-1': 'Recommendations for Sustaining Progress:',
  'j9ro-1': 'Next Steps and Referrals (if applicable)',
  'z3zc-1': 'Full Name & Credentials (Signature)',
  'z3zc-2': 'Date Completed',
  '45z4-1': 'Documented by Supervised Clinician (if applicable)',
}

/**
 * Per-note-type id -> field name maps. Treatment plan is intentionally
 * absent — see the file-level comment on why its ids can't be trusted, and
 * buildSessionObject's text-label fallback below for how it's handled.
 */
const FIELD_MAPPING_BY_TYPE: Record<number, Record<string, string>> = {
  [SessionTypeEnum.progress_note]: FIELD_MAPPING,
  [SessionTypeEnum.intake]: INTAKE_FIELD_MAPPING,
  [SessionTypeEnum.termination]: TERMINATION_FIELD_MAPPING,
}

/**
 * PracticeQ's note-type label (sent as NoteName, and sometimes as Type) ->
 * SessionTypeEnum. The four "primary" keys are the exact note_name values
 * confirmed from the client's sample note structures; the rest are
 * best-guess aliases kept as a safety net for label variations we haven't
 * seen yet.
 */
const TYPE_LABEL_TO_ENUM: Record<string, number> = {
  // Confirmed exact labels from sample note structures
  'progress note': SessionTypeEnum.progress_note,
  'initial consultation: intake/assessment': SessionTypeEnum.intake,
  'initial consultation: assessment/treatment plan': SessionTypeEnum.treatment_plan,
  'termination note': SessionTypeEnum.termination,
  // Unconfirmed aliases — kept as a fallback net, verify against real
  // payloads before relying on these for anything but a warning log.
  progress: SessionTypeEnum.progress_note,
  intake: SessionTypeEnum.intake,
  'intake note': SessionTypeEnum.intake,
  'intake/assessment': SessionTypeEnum.intake,
  'treatment plan': SessionTypeEnum.treatment_plan,
  'treatment plan note': SessionTypeEnum.treatment_plan,
  termination: SessionTypeEnum.termination,
  discharge: SessionTypeEnum.termination,
}

/**
 * Substring fallback for label variants the exact map doesn't catch (extra
 * spacing, punctuation differences, suffixes like "Progress Note - Adult").
 * Order matters: check the more specific phrases before generic ones so a
 * treatment plan (which also contains the word "assessment") doesn't get
 * misread as an intake note.
 */
function fuzzyMatchType(key: string): number | undefined {
  if (key.includes('treatment plan')) return SessionTypeEnum.treatment_plan
  if (key.includes('termination') || key.includes('discharge')) return SessionTypeEnum.termination
  if (key.includes('intake')) return SessionTypeEnum.intake
  if (key.includes('progress')) return SessionTypeEnum.progress_note
  return undefined
}

export interface ResolvedSessionType {
  type: number
  /**
   * True when we're confident this is the right type — either an exact/fuzzy
   * label match, or no label was sent at all (existing payloads never sent
   * one and are progress notes; treat that case as a confident default, not
   * a guess). False only when a label WAS sent but we don't recognize it —
   * in that case buildSessionObject should not trust the progress-note id
   * map, since an unknown note type's ids could collide with it (see
   * file-level comment on id collisions).
   */
  matched: boolean
}

/**
 * Resolve a PracticeQ note-type label to our internal SessionTypeEnum value.
 * Falls back to progress_note for anything unrecognized (and logs, unless
 * the label was simply absent — see ResolvedSessionType.matched above for
 * why that distinction matters to callers).
 */
export function resolveSessionType(typeValue?: string | null, noteId?: string): ResolvedSessionType {
  if (!typeValue || typeof typeValue !== 'string' || !typeValue.trim()) {
    return { type: SessionTypeEnum.progress_note, matched: true }
  }

  const key = typeValue.trim().toLowerCase()
  const resolved = TYPE_LABEL_TO_ENUM[key] ?? fuzzyMatchType(key)

  if (resolved) {
    return { type: resolved, matched: true }
  }

  logger.warn('[NoteType] Unrecognized note type label, defaulting to progress_note', {
    noteId,
    typeValue,
  })
  return { type: SessionTypeEnum.progress_note, matched: false }
}

interface QuestionLike {
  id?: string
  Id?: string
  text?: string
  Text?: string
  answer?: unknown
  Answer?: unknown
}

/**
 * Answers are supposed to be strings, but PracticeQ (or a malformed payload)
 * could send a boolean, number, or an array (multi-select). `?? ''` only
 * guards null/undefined, so `false` or `0` would otherwise pass through as
 * non-strings and break downstream code that calls .trim()/.toLowerCase() on
 * session values. Normalize everything to a string here instead.
 */
function formatAnswer(answer: unknown): string {
  if (typeof answer === 'string') return answer
  if (answer === null || answer === undefined) return ''
  if (Array.isArray(answer)) return answer.map((a) => formatAnswer(a)).join(', ')
  return String(answer)
}

/**
 * Build the session JSON object from a note's Questions array.
 *
 * @param sessionType Pass `resolveSessionType(...).type` when `matched` is
 *   true. When the caller isn't confident about the type (matched: false),
 *   pass `undefined` instead of the fallback type — this skips the id map
 *   entirely for that note, since applying progress-note ids to an unknown
 *   note type risks silently mislabeling fields via an id collision.
 *
 * Order of preference for each question's field name:
 *  1. The canonical field name for its id, *within this note type's map*
 *     (never looked up against another type's ids).
 *  2. The question's own `text` label, as sent by PracticeQ. This is what
 *     correctly captures treatment-plan notes (dynamic per-instance ids)
 *     and any note type we haven't explicitly mapped yet.
 *  3. The raw id, as a last resort, so a question is never silently dropped.
 *
 * If the resulting field name repeats (this genuinely happens on treatment
 * plans — e.g. "Status" and "Target Completion Date (within 3 months)" each
 * appear on every one of the up-to-4 goal blocks), later occurrences are
 * suffixed with " (2)", " (3)", etc. instead of overwriting earlier ones, so
 * no goal's data is ever silently lost.
 */
export function buildSessionObject(
  questions: QuestionLike[] | undefined | null,
  sessionType?: number
): Record<string, string> {
  const sessionObject: Record<string, string> = {}
  if (!Array.isArray(questions)) return sessionObject

  const idMap = (sessionType && FIELD_MAPPING_BY_TYPE[sessionType]) || {}
  const seenCount: Record<string, number> = {}

  for (const q of questions) {
    const id = q?.id ?? q?.Id
    const text = q?.text ?? q?.Text
    const answer = formatAnswer(q?.answer ?? q?.Answer)

    const baseFieldName = (id && idMap[id]) || text || id
    if (!baseFieldName) continue

    const occurrence = (seenCount[baseFieldName] ?? 0) + 1
    seenCount[baseFieldName] = occurrence
    const fieldName = occurrence > 1 ? `${baseFieldName} (${occurrence})` : baseFieldName

    sessionObject[fieldName] = answer
  }

  return sessionObject
}
