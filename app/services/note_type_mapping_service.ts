import { SessionTypeEnum } from "#enums/session_enum";
import logger from "@adonisjs/core/services/logger";

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
  "p9m9-1": "Session Duration",
  "1hye-1": "Mental Status (optional)",
  "kxgx-7": "Suicidality",
  "kxgx-8": "Homicidality",
  "6tx9-1": "Subjective",
  "rb2f-1": "Objective",
  "zad8-1": "Assessment & Therapeutic Intervention",
  "ugq6-1": "Reaction to Intervention",
  "hnfi-1": "Plan and Collaboration",
  "9z5t-1": "Therapist Reflection and Insight (optional)",
  "gm4p-1": "Progress",
  "4lbp-1": "Therapist Initials",
  // Progress Note / webhook payload (same input shape)
  "p46w-1": "First Name:",
  "p46w-2": "Last Name:",
  "p46w-3": "Date of Birth:",
  "g39u-1": "Session Duration",
  "d1zt-1": "Encounter Type & Method",
  "cupi-1": "Mental Status (optional)",
  "br4k-1": "Suicidality",
  "br4k-2": "Homicidality",
  "ujky-1": "Subjective",
  "k8nq-1": "Objective",
  "nbli-1": "Assessment & Therapeutic Intervention",
  "m5uu-1": "Reaction to Intervention",
  "u3jf-1": "Plan and Collaboration",
  "x1gq-1": "Therapist Reflection and Insight (optional)",
  "cpb1-1": "Progress",
  "zqpc-1": "Full Name & Credentials (Signature)",
  "zqpc-2": "Date Completed",
  "5r6o-1": "Documented by Supervised Clinician (if applicable)",
};

// Intake ("Initial Consultation: Intake/Assessment") id -> field name.
const INTAKE_FIELD_MAPPING: Record<string, string> = {
  "ot2p-1": "First Name:",
  "ot2p-3": "Last Name:",
  "ot2p-4": "Date of Birth:",
  "ot2p-5": "Initiation date",
  "fiuw-1": "Encounter Type & Method",
  "l97s-1": "Mental Status",
  "h08z-1": "Presenting Problem & Symptoms",
  "t6rq-1":
    "Pertinent history as related to presenting problem, trauma, abuse, etc",
  "u6ll-1": "Bio/Psychosocial Assessment",
  "a8yi-1": "Family History",
  "kxgx-1": "Risk Assessment",
  "nv9g-1": "Strengths",
  "zad8-1": "Tenative Goals and Plans",
  "qaa1-1": "Involvement",
  "g6eo-1": "Cultural Variables?",
  "c5zm-1": "If yes, please explain explain",
  "jfnz-1": "Is Client Appropriate For Agency Services?",
  "2xvm-1": "If no, please explain",
  "9j7d-1": "Full Name & Credentials (Signature)",
  "9j7d-2": "Date Completed",
  "a17g-1": "Documented by Supervised Clinician (if applicable)",
};

// Termination Note id -> field name.
const TERMINATION_FIELD_MAPPING: Record<string, string> = {
  "uap4-1": "First Name:",
  "uap4-3": "Last Name:",
  "uap4-4": "Date of Birth:",
  "uap4-5": "Initiation Date:",
  "uap4-6": "Review on",
  "uap4-7": "days on",
  "amrh-1": "Encounter Type & Method",
  "fvuz-1": "Treatment Goals & Objectives:",
  "pqkf-1": "Progress Overview:",
  "vqnh-1": "Client's Reflections:",
  "t24x-1": "Client Satisfaction Level:",
  "k5h4-1": "Engagement Level:",
  "101p-1": "Progress and Growth Areas:",
  "qnhp-1": "Recommendations for Sustaining Progress:",
  "j9ro-1": "Next Steps and Referrals (if applicable)",
  "z3zc-1": "Full Name & Credentials (Signature)",
  "z3zc-2": "Date Completed",
  "45z4-1": "Documented by Supervised Clinician (if applicable)",
};

// Treatment plan is left out on purpose - ids aren't reliable for it,
// so it always falls back to question text (see file comment up top).
const FIELD_MAPPING_BY_TYPE: Record<number, Record<string, string>> = {
  [SessionTypeEnum.progress_note]: FIELD_MAPPING,
  [SessionTypeEnum.intake]: INTAKE_FIELD_MAPPING,
  [SessionTypeEnum.termination]: TERMINATION_FIELD_MAPPING,
};

// PracticeQ's NoteName (or Type) -> our enum. First four are confirmed
// from the real sample data; the rest are guesses in case the wording
// comes through differently on some notes.
const TYPE_LABEL_TO_ENUM: Record<string, number> = {
  "progress note": SessionTypeEnum.progress_note,
  "initial consultation: intake/assessment": SessionTypeEnum.intake,
  "initial consultation: assessment/treatment plan":
    SessionTypeEnum.treatment_plan,
  "termination note": SessionTypeEnum.termination,
  // unconfirmed aliases, just a safety net
  progress: SessionTypeEnum.progress_note,
  intake: SessionTypeEnum.intake,
  "intake note": SessionTypeEnum.intake,
  "intake/assessment": SessionTypeEnum.intake,
  "treatment plan": SessionTypeEnum.treatment_plan,
  "treatment plan note": SessionTypeEnum.treatment_plan,
  termination: SessionTypeEnum.termination,
  discharge: SessionTypeEnum.termination,
};

// Backup for label variants the exact map above misses (extra spacing,
// a suffix like "Progress Note - Adult", etc). Check "treatment plan"
// before "intake" - the real treatment plan label also contains the
// word "assessment" so order matters here.
function fuzzyMatchType(key: string): number | undefined {
  if (key.includes("treatment plan")) return SessionTypeEnum.treatment_plan;
  if (key.includes("termination") || key.includes("discharge"))
    return SessionTypeEnum.termination;
  if (key.includes("intake")) return SessionTypeEnum.intake;
  if (key.includes("progress")) return SessionTypeEnum.progress_note;
  return undefined;
}

export interface ResolvedSessionType {
  type: number;
  // false only when a label was actually sent and we didn't recognize it -
  // a missing label still counts as matched, since older payloads never
  // sent one and we know those are progress notes.
  matched: boolean;
}

// Maps a PracticeQ type label to our enum. Falls back to progress note
// for anything we don't recognize (and logs it, unless there was just no
// label at all - that's expected on older payloads, not worth a warning).
export function resolveSessionType(
  typeValue?: string | null,
  noteId?: string,
): ResolvedSessionType {
  if (!typeValue || typeof typeValue !== "string" || !typeValue.trim()) {
    return { type: SessionTypeEnum.progress_note, matched: true };
  }

  const key = typeValue.trim().toLowerCase();
  const resolved = TYPE_LABEL_TO_ENUM[key] ?? fuzzyMatchType(key);

  if (resolved) {
    return { type: resolved, matched: true };
  }

  logger.warn(
    "[NoteType] Unrecognized note type label, defaulting to progress_note",
    {
      noteId,
      typeValue,
    },
  );
  return { type: SessionTypeEnum.progress_note, matched: false };
}

interface QuestionLike {
  id?: string;
  Id?: string;
  text?: string;
  Text?: string;
  answer?: unknown;
  Answer?: unknown;
}

// answer should always be a string, but `?? ''` doesn't catch false/0/etc,
// so this makes sure we never end up storing a non-string value.
function formatAnswer(answer: unknown): string {
  if (typeof answer === "string") return answer;
  if (answer === null || answer === undefined) return "";
  if (Array.isArray(answer))
    return answer.map((a) => formatAnswer(a)).join(", ");
  return String(answer);
}

// Builds the session object from a note's Questions array.
//
// Pass sessionType from resolveSessionType(...).type, but only when
// matched was true - otherwise pass undefined so we skip the id map
// instead of risking the wrong field names on a type we don't recognize.
//
// Field name for each question: the id map for this type if we have one,
// otherwise PracticeQ's own question text, otherwise the raw id. Treatment
// plans repeat labels like "Status" across goal blocks, so repeats get
// numbered (2), (3), etc rather than overwriting each other.
export function buildSessionObject(
  questions: QuestionLike[] | undefined | null,
  sessionType?: number,
): Record<string, string> {
  const sessionObject: Record<string, string> = {};
  if (!Array.isArray(questions)) return sessionObject;

  const idMap = (sessionType && FIELD_MAPPING_BY_TYPE[sessionType]) || {};
  const seenCount: Record<string, number> = {};

  for (const q of questions) {
    const id = q?.id ?? q?.Id;
    const text = q?.text ?? q?.Text;
    const answer = formatAnswer(q?.answer ?? q?.Answer);

    const baseFieldName = (id && idMap[id]) || text || id;
    if (!baseFieldName) continue;

    const occurrence = (seenCount[baseFieldName] ?? 0) + 1;
    seenCount[baseFieldName] = occurrence;
    const fieldName =
      occurrence > 1 ? `${baseFieldName} (${occurrence})` : baseFieldName;

    sessionObject[fieldName] = answer;
  }

  return sessionObject;
}
