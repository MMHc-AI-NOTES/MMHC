import { SessionTypeEnum } from '#enums/session_enum'
import logger from '@adonisjs/core/services/logger'

// Shared note-type + field-mapping logic for the two ingestion paths
// (webhook_service.ts and sync_morf_notes.ts). Notes used to get saved as
// progress notes no matter what PracticeQ actually sent - this reads the
// real type off the payload and maps the right fields for it.
//
// Two things worth knowing from the sample data: question ids aren't
// unique across note types (zad8-1 means something different on a
// progress note vs an intake note), so lookups have to be scoped per
// type. And the treatment plan template's ids aren't stable between
// notes (dynamic goal blocks), so that one just uses PracticeQ's own
// question text instead of an id map - see buildSessionObject below.

// Progress note id -> field name. This is already live, other stored
// sessions and the MCP prompt depend on these exact names, so don't
// rename anything here without a migration.
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

// Intake ("Initial Consultation: Intake/Assessment") id -> field name.
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

// Termination Note id -> field name.
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

// Treatment plan id -> field name. Two form variants are in circulation and
// their ids do not overlap, so both live here.
//
// Variant A carries three goal blocks, koai, has1 and 4yq4. The suffixes are
// not in display order: koai-5 (Status) arrives before koai-4 (Short-Term
// Objective 1), so names follow meaning rather than number.
//
// Variant B carries four, and its goal and objective headings hold no answer,
// only the dates beneath them do.
const TREATMENT_PLAN_FIELD_MAPPING: Record<string, string> = {
  'uap4-1': 'First Name:',
  'uap4-3': 'Last Name:',
  'uap4-4': 'Date of Birth:',
  'uap4-5': 'Initiation Date:',
  'uap4-6': 'Review on',
  'uap4-7': 'days on',
  '425q-1': 'Referral for Additional Services?',
  '425q-2': 'If yes, specify:',
  '1abg-1': 'Encounter Type & Method',
  'yshx-1': 'Session Frequency:',
  'yshx-2': 'Expected Duration:',
  'pqkf-1': 'Treatment Modality',
  'my3p-1': 'Primary Clinical Approach',
  'qn1y-1': 'Secondary Clinical Approach',
  'zad8-1': 'Tenative Goals & Plans:',
  '5mbv-1': 'Expected Length of Treatment:',
  'cj7t-1': 'Appointments Frequency:',

  // Variant A, goal 1
  'koai-1': 'Goal 1 Long-Term Goal',
  'koai-2': 'Goal 1 Target Completion Date',
  'koai-5': 'Goal 1 Status',
  'koai-4': 'Goal 1 Short-Term Objective 1',
  'koai-7': 'Goal 1 Objective 1 Target Date',
  'koai-11': 'Goal 1 Objective 1 Status',
  'koai-8': 'Goal 1 Short-Term Objective 2',
  'koai-9': 'Goal 1 Objective 2 Target Date',
  'koai-10': 'Goal 1 Objective 2 Status',
  'koai-12': 'Goal 1 Primary Clinical Intervention',
  'koai-13': 'Goal 1 Secondary Clinical Intervention',
  'koai-6': 'Goal 1 Notes',

  // Variant A, goal 2
  'has1-1': 'Goal 2 Long-Term Goal',
  'has1-2': 'Goal 2 Target Completion Date',
  'has1-5': 'Goal 2 Status',
  'has1-4': 'Goal 2 Short-Term Objective 1',
  'has1-7': 'Goal 2 Objective 1 Target Date',
  'has1-11': 'Goal 2 Objective 1 Status',
  'has1-8': 'Goal 2 Short-Term Objective 2',
  'has1-9': 'Goal 2 Objective 2 Target Date',
  'has1-10': 'Goal 2 Objective 2 Status',
  'has1-12': 'Goal 2 Primary Clinical Intervention',
  'has1-13': 'Goal 2 Secondary Clinical Intervention',
  'has1-6': 'Goal 2 Notes',

  // Variant A, goal 3 (optional on the form)
  '4yq4-1': 'Goal 3 Long-Term Goal',
  '4yq4-2': 'Goal 3 Target Completion Date',
  '4yq4-5': 'Goal 3 Status',
  '4yq4-4': 'Goal 3 Short-Term Objective 1',
  '4yq4-7': 'Goal 3 Objective 1 Target Date',
  '4yq4-11': 'Goal 3 Objective 1 Status',
  '4yq4-8': 'Goal 3 Short-Term Objective 2',
  '4yq4-9': 'Goal 3 Objective 2 Target Date',
  '4yq4-10': 'Goal 3 Objective 2 Status',
  '4yq4-12': 'Goal 3 Primary Clinical Intervention',
  '4yq4-13': 'Goal 3 Secondary Clinical Intervention',
  '4yq4-6': 'Goal 3 Notes',

  // Variant B. The goal and objective headings carry instruction text and no
  // answer, so they are named plainly and drop out of display when empty.
  'fvuz-1': 'Goal 1 Long-Term Goal',
  'e0cx-1': 'Goal 1 Target Completion Date',
  '2ivu-1': 'Goal 1 Objectives and Interventions',
  'i2k9-2': 'Goal 1 Intervention Completion Date',
  'i2k9-1': 'Goal 1 Intervention 1a Completion Date',
  'rt7s-1': 'Goal 2 Long-Term Goal',
  'f220-1': 'Goal 2 Target Completion Date',
  'mb2a-1': 'Goal 2 Objectives and Interventions',
  '6t4l-2': 'Goal 2 Intervention Completion Date',
  '6t4l-1': 'Goal 2 Intervention 2a Completion Date',
  'n9fx-1': 'Goal 3 Long-Term Goal',
  '6tai-1': 'Goal 3 Target Completion Date',
  'spdh-1': 'Goal 3 Objectives and Interventions',
  'qgx7-2': 'Goal 3 Intervention Completion Date',
  'qgx7-1': 'Goal 3 Intervention 3a Completion Date',
  'e12d-1': 'Goal 4 Long-Term Goal',
  'r685-1': 'Goal 4 Target Completion Date',
  'eafq-1': 'Goal 4 Objectives and Interventions',
  'a28a-2': 'Goal 4 Intervention Completion Date',
  'a28a-1': 'Goal 4 Intervention 4a Completion Date',

  '8pav-1': 'Progress Since Last Plan',
  '8ys9-1': 'Full Name & Credentials (Signature)',
  '8ys9-2': 'Date Completed',
  'd5sc-1': 'Documented by Supervised Clinician (if applicable)',
}

const FIELD_MAPPING_BY_TYPE: Record<number, Record<string, string>> = {
  [SessionTypeEnum.progress_note]: FIELD_MAPPING,
  [SessionTypeEnum.intake]: INTAKE_FIELD_MAPPING,
  [SessionTypeEnum.treatment_plan]: TREATMENT_PLAN_FIELD_MAPPING,
  [SessionTypeEnum.termination]: TERMINATION_FIELD_MAPPING,
}

// PracticeQ's NoteName (or Type) -> our enum. First four are confirmed
// from the real sample data; the rest are guesses in case the wording
// comes through differently on some notes.
// Stable names for the four note types, used wherever a type has to travel
// outside the application. Numbers stay in the database, these go on the wire.
export const SESSION_TYPE_SLUG: Record<number, string> = {
  [SessionTypeEnum.progress_note]: 'progress_note',
  [SessionTypeEnum.intake]: 'intake',
  [SessionTypeEnum.treatment_plan]: 'treatment_plan',
  [SessionTypeEnum.termination]: 'termination',
}

export function sessionTypeSlug(sessionType?: number | null): string {
  if (sessionType === null || sessionType === undefined) return 'unknown'
  return SESSION_TYPE_SLUG[sessionType] ?? 'unknown'
}

const TYPE_LABEL_TO_ENUM: Record<string, number> = {
  'progress note': SessionTypeEnum.progress_note,
  'initial consultation: intake/assessment': SessionTypeEnum.intake,
  'initial consultation: assessment/treatment plan': SessionTypeEnum.treatment_plan,
  'termination note': SessionTypeEnum.termination,
  // unconfirmed aliases, just a safety net
  'progress': SessionTypeEnum.progress_note,
  'intake': SessionTypeEnum.intake,
  'intake note': SessionTypeEnum.intake,
  'intake/assessment': SessionTypeEnum.intake,
  'treatment plan': SessionTypeEnum.treatment_plan,
  'treatment plan note': SessionTypeEnum.treatment_plan,
  'termination': SessionTypeEnum.termination,
  'discharge': SessionTypeEnum.termination,
}

// Backup for label variants the exact map above misses (extra spacing,
// a suffix like "Progress Note - Adult", etc). Check "treatment plan"
// before "intake" - the real treatment plan label also contains the
// word "assessment" so order matters here.
function fuzzyMatchType(key: string): number | undefined {
  if (key.includes('treatment plan')) return SessionTypeEnum.treatment_plan
  if (key.includes('termination') || key.includes('discharge')) return SessionTypeEnum.termination
  if (key.includes('intake')) return SessionTypeEnum.intake
  if (key.includes('progress')) return SessionTypeEnum.progress_note
  return undefined
}

export interface ResolvedSessionType {
  type: number
  // false only when a label was actually sent and we didn't recognize it -
  // a missing label still counts as matched, since older payloads never
  // sent one and we know those are progress notes.
  matched: boolean
}

// Maps a PracticeQ type label to our enum. Falls back to progress note
// for anything we don't recognize (and logs it, unless there was just no
// label at all - that's expected on older payloads, not worth a warning).
export function resolveSessionType(
  typeValue?: string | null,
  noteId?: string
): ResolvedSessionType {
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

// answer should always be a string, but `?? ''` doesn't catch false/0/etc,
// so this makes sure we never end up storing a non-string value.
function formatAnswer(answer: unknown): string {
  if (typeof answer === 'string') return answer
  if (answer === null || answer === undefined) return ''
  if (Array.isArray(answer)) return answer.map((a) => formatAnswer(a)).join(', ')
  return String(answer)
}

// PracticeQ labels a question with the text the clinician reads on the form,
// which often carries the instructions with it:
//
//   "Treatment Goal  #1\nInstructions: Enter the clients primary goal..."
//
// The id maps above cover the form variants we have seen, but a variant we
// have not seen falls back to this text and turns it into a heading, which is
// unreadable and never matches a section. Question ids change between
// variants; the label the clinician reads does not. Normalising the label
// keeps a new variant readable without waiting on a code change.
const GOAL_LABEL_RULES: [RegExp, string][] = [
  // The initial plan heads its goal blocks "Tentative Goal 1" and the 90 day
  // renewal heads the same blocks "Treatment Goal #1". Tentative describes when
  // the goal was written, not what the field is, so both resolve to one name.
  // Splitting them would double the goal sections and show a client's initial
  // plan and their renewal under different headings.
  // Each rule consumes the rest of the label. What follows a goal heading is
  // decoration, "(optional)" or the instructions, and never another field.
  [/^Tentative\s+(?:Treatment\s+)?Goal\s*#?\s*(\d+).*$/i, 'Goal $1 Long-Term Goal'],
  [
    /^Objective,?\s*Intervention and Status for\s*GOAL\s*#?\s*(\d+).*$/i,
    'Goal $1 Objectives and Interventions',
  ],
  [/^Treatment\s*Goal\s*#?\s*(\d+).*$/i, 'Goal $1 Long-Term Goal'],
  [/^Goal\s*#?\s*(\d+)\s+Target Completion Date.*$/i, 'Goal $1 Target Completion Date'],
  [
    /^Intervention\s*#?\s*(\d+)([a-z])\s+Completion Date.*$/i,
    'Goal $1 Intervention $1$2 Completion Date',
  ],
  [/^Intervention\s*#?\s*(\d+)\s+Completion Date.*$/i, 'Goal $1 Intervention Completion Date'],
  [/^Goal\s*#\s*(\d+)\s+(.+)$/i, 'Goal $1 $2'],
]

export function normaliseQuestionLabel(text: string | undefined | null): string {
  if (!text) return ''

  let label = String(text)
    .split(/\n\s*Instructions\s*:/i)[0]
    .split('\n')[0]
    .replace(/\s*\(OPTIONAL\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!label) return ''

  for (const [pattern, replacement] of GOAL_LABEL_RULES) {
    if (pattern.test(label)) return label.replace(pattern, replacement).trim()
  }

  return label
}

// Builds the session object from a note's Questions array.
//
// Pass sessionType from resolveSessionType(...).type, but only when
// matched was true - otherwise pass undefined so we skip the id map
// instead of risking the wrong field names on a type we don't recognize.
//
// Field name for each question: the id map for this type if we have one,
// otherwise the normalised question label, otherwise the raw id. Treatment
// plans repeat labels like "Status" across goal blocks, so repeats get
// numbered (2), (3), etc rather than overwriting each other.
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

    const baseFieldName = (id && idMap[id]) || normaliseQuestionLabel(text) || id
    if (!baseFieldName) continue

    const occurrence = (seenCount[baseFieldName] ?? 0) + 1
    seenCount[baseFieldName] = occurrence
    const fieldName = occurrence > 1 ? `${baseFieldName} (${occurrence})` : baseFieldName

    sessionObject[fieldName] = answer
  }

  return sessionObject
}
