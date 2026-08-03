/**
 * Sections a finding can be attached to, for every note type.
 *
 * The UI keys its lookup by both display_name and field_id, so a repeat of
 * either silently takes over another section. Ids 1 to 13 must not move:
 * sme_issues_tamplate and every existing SME issue point at them.
 */
export interface AnnotatableSection {
  id: number
  field_id: string
  display_name: string
}

const PROGRESS_NOTE_SECTIONS: AnnotatableSection[] = [
  { id: 1, field_id: 'p9m9-1', display_name: 'Session Duration' },
  { id: 2, field_id: '1hye-1', display_name: 'Mental Status' },
  { id: 3, field_id: '6tx9-1', display_name: 'Subjective' },
  { id: 4, field_id: 'rb2f-1', display_name: 'Objective' },
  { id: 5, field_id: 'zad8-1', display_name: 'Assessment & Therapeutic Intervention' },
  { id: 6, field_id: 'ugq6-1', display_name: 'Reaction to Intervention' },
  { id: 7, field_id: 'hnfi-1', display_name: 'Plan and Collaboration' },
  { id: 8, field_id: '9z5t-1', display_name: 'Therapist Reflection and Insight' },
  { id: 9, field_id: 'gm4p-1', display_name: 'Progress' },
  { id: 10, field_id: 'kxgx-7', display_name: 'Suicidality' },
  { id: 11, field_id: 'kxgx-8', display_name: 'Homicidality' },
  { id: 12, field_id: '4lbp-1', display_name: 'Therapist Initials' },
  { id: 13, field_id: 'overall', display_name: 'Overall' },
]

/** Appear on more than one note type, so one row each rather than one per type. */
const SHARED_SECTIONS: AnnotatableSection[] = [
  { id: 14, field_id: 'ot2p-1', display_name: 'First Name:' },
  { id: 15, field_id: 'ot2p-3', display_name: 'Last Name:' },
  { id: 16, field_id: 'ot2p-4', display_name: 'Date of Birth:' },
  { id: 17, field_id: 'fiuw-1', display_name: 'Encounter Type & Method' },
  { id: 18, field_id: '9j7d-1', display_name: 'Full Name & Credentials (Signature)' },
  { id: 19, field_id: '9j7d-2', display_name: 'Date Completed' },
  {
    id: 20,
    field_id: 'a17g-1',
    display_name: 'Documented by Supervised Clinician (if applicable)',
  },
]

/** Mental Status is absent on purpose: it is id 2 and must not be repeated. */
const INTAKE_SECTIONS: AnnotatableSection[] = [
  { id: 21, field_id: 'ot2p-5', display_name: 'Initiation date' },
  { id: 22, field_id: 'h08z-1', display_name: 'Presenting Problem & Symptoms' },
  {
    id: 23,
    field_id: 't6rq-1',
    display_name: 'Pertinent history as related to presenting problem, trauma, abuse, etc',
  },
  { id: 24, field_id: 'u6ll-1', display_name: 'Bio/Psychosocial Assessment' },
  { id: 25, field_id: 'a8yi-1', display_name: 'Family History' },
  { id: 26, field_id: 'kxgx-1', display_name: 'Risk Assessment' },
  { id: 27, field_id: 'nv9g-1', display_name: 'Strengths' },
  // zad8-1 is id 5 on progress notes, so this one is suffixed.
  { id: 28, field_id: 'zad8-1-intake', display_name: 'Tenative Goals and Plans' },
  { id: 29, field_id: 'qaa1-1', display_name: 'Involvement' },
  { id: 30, field_id: 'g6eo-1', display_name: 'Cultural Variables?' },
  { id: 31, field_id: 'c5zm-1', display_name: 'If yes, please explain explain' },
  { id: 32, field_id: 'jfnz-1', display_name: 'Is Client Appropriate For Agency Services?' },
  { id: 33, field_id: '2xvm-1', display_name: 'If no, please explain' },
]

const TERMINATION_SECTIONS: AnnotatableSection[] = [
  { id: 34, field_id: 'uap4-5', display_name: 'Initiation Date:' },
  { id: 35, field_id: 'uap4-6', display_name: 'Review on' },
  { id: 36, field_id: 'uap4-7', display_name: 'days on' },
  { id: 37, field_id: 'fvuz-1', display_name: 'Treatment Goals & Objectives:' },
  { id: 38, field_id: 'pqkf-1', display_name: 'Progress Overview:' },
  { id: 39, field_id: 'vqnh-1', display_name: "Client's Reflections:" },
  { id: 40, field_id: 't24x-1', display_name: 'Client Satisfaction Level:' },
  { id: 41, field_id: 'k5h4-1', display_name: 'Engagement Level:' },
  { id: 42, field_id: '101p-1', display_name: 'Progress and Growth Areas:' },
  { id: 43, field_id: 'qnhp-1', display_name: 'Recommendations for Sustaining Progress:' },
  { id: 44, field_id: 'j9ro-1', display_name: 'Next Steps and Referrals (if applicable)' },
]

const TREATMENT_PLAN_SECTIONS: AnnotatableSection[] = [
  { id: 45, field_id: '425q-1', display_name: 'Referral for Additional Services?' },
  { id: 46, field_id: '425q-2', display_name: 'If yes, specify:' },
  { id: 47, field_id: 'yshx-1', display_name: 'Session Frequency:' },
  { id: 48, field_id: 'yshx-2', display_name: 'Expected Duration:' },
  // pqkf-1 is Progress Overview on termination, id 38.
  { id: 49, field_id: 'pqkf-1-tp', display_name: 'Treatment Modality' },
  { id: 50, field_id: 'my3p-1', display_name: 'Primary Clinical Approach' },
  { id: 51, field_id: 'qn1y-1', display_name: 'Secondary Clinical Approach' },
  // zad8-1 is taken twice already, by id 5 and id 28.
  { id: 52, field_id: 'zad8-1-tp', display_name: 'Tenative Goals & Plans:' },
  { id: 53, field_id: '5mbv-1', display_name: 'Expected Length of Treatment:' },
  { id: 54, field_id: 'cj7t-1', display_name: 'Appointments Frequency:' },
  // Needs its own row, otherwise the UI's substring fallback matches the
  // progress note section named Progress.
  { id: 55, field_id: '8pav-1', display_name: 'Progress Since Last Plan' },
]

/**
 * Present on the current PracticeQ forms but absent from the payloads we had
 * catalogued, so they had no section and could not be annotated.
 */
const LATER_FORM_SECTIONS: AnnotatableSection[] = [
  // On the intake, the treatment plan and the combined form.
  { id: 56, field_id: 'current-diagnosis', display_name: 'Current Diagnosis' },
  // On the combined intake and progress note form.
  { id: 57, field_id: 'communication-difficulties', display_name: 'Communication Difficulties' },
  { id: 58, field_id: 'enhanced-communication', display_name: 'Enhanced Communication' },
]

/**
 * One row per goal field rather than one per goal. Registering only "Goal 1"
 * and leaning on substring matching sent "Goal 2 Short-Term Objective 1" to the
 * progress note Objective section, since the fallback matches any shared word.
 * The template dropdown is filtered per field, so this length is never shown.
 */
const GOAL_FIELDS = [
  'Long-Term Goal',
  'Target Completion Date',
  'Status',
  'Short-Term Objective 1',
  'Objective 1 Target Date',
  'Objective 1 Status',
  'Short-Term Objective 2',
  'Objective 2 Target Date',
  'Objective 2 Status',
  'Primary Clinical Intervention',
  'Secondary Clinical Intervention',
  'Notes',
  'Objectives and Interventions',
  'Intervention Completion Date',
]

const GOAL_ID_BASE = 60
const GOAL_COUNT = 4

const buildGoalSections = (): AnnotatableSection[] => {
  const sections: AnnotatableSection[] = []

  for (let goal = 1; goal <= GOAL_COUNT; goal++) {
    GOAL_FIELDS.forEach((field, index) => {
      sections.push({
        id: GOAL_ID_BASE + (goal - 1) * GOAL_FIELDS.length + index,
        field_id: `goal-${goal}-${index}`,
        display_name: `Goal ${goal} ${field}`,
      })
    })

    // Numbered after its own goal on one form variant, so it cannot come from
    // the shared list above.
    sections.push({
      id: GOAL_ID_BASE + GOAL_COUNT * GOAL_FIELDS.length + (goal - 1),
      field_id: `goal-${goal}-intervention-a`,
      display_name: `Goal ${goal} Intervention ${goal}a Completion Date`,
    })
  }

  return sections
}

export const ANNOTATABLE_SECTIONS: AnnotatableSection[] = [
  ...PROGRESS_NOTE_SECTIONS,
  ...SHARED_SECTIONS,
  ...INTAKE_SECTIONS,
  ...TERMINATION_SECTIONS,
  ...TREATMENT_PLAN_SECTIONS,
  ...LATER_FORM_SECTIONS,
  ...buildGoalSections(),
]

/** Throws if a name, field id or id repeats. */
export const assertSectionsAreUnique = (sections = ANNOTATABLE_SECTIONS): void => {
  for (const key of ['display_name', 'field_id', 'id'] as const) {
    const values = sections.map((section) => section[key])
    if (new Set(values).size !== values.length) {
      const repeated = values.filter((value, index) => values.indexOf(value) !== index)
      throw new Error(
        `issues_related_to has a duplicate ${key}: ${[...new Set(repeated)].join(', ')}`
      )
    }
  }
}
