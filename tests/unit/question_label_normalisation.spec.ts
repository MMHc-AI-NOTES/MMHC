import { test } from '@japa/runner'
import { normaliseQuestionLabel, buildSessionObject } from '#services/note_type_mapping_service'
import { ANNOTATABLE_SECTIONS } from '#services/annotatable_sections'
import { SessionTypeEnum } from '#enums/session_enum'

/** The labels a real four goal treatment plan stored on staging. */
const OBSERVED_TREATMENT_PLAN_LABELS = [
  'Treatment Goal  #1\nInstructions: Enter the clients primary goal for treatment',
  'Treatment Goal  #2\nInstructions: Enter the clients primary goal for treatment',
  'Treatment Goal  #3 (OPTIONAL)\nInstructions: Enter the clients primary goal for treatment',
  'Treatment Goal  #4 (OPTIONAL)\nInstructions: Enter the clients primary goal for treatment',
  'Goal #1  Target Completion Date',
  'Goal #2  Target Completion Date',
  'Goal #3 Target Completion Date',
  'Goal #4 Target Completion Date',
  'Objective, Intervention and Status for GOAL #1\nInstructions: List each measurable objective and planned intervention. Use the dropdown to track progress.',
  'Objective, Intervention and Status for GOAL #4 (OPTIONAL)\nInstructions: List each measurable objective and planned intervention. Use the dropdown to track progress.',
  'Intervention #1 Completion Date',
  'Intervention #1a Completion Date',
  'Intervention #4a Completion Date',
]

test.group('Question label normalisation', () => {
  test('instruction text is dropped from the heading', ({ assert }) => {
    assert.equal(
      normaliseQuestionLabel(
        'Treatment Goal  #1\nInstructions: Enter the clients primary goal for treatment'
      ),
      'Goal 1 Long-Term Goal'
    )
  })

  test('no normalised label keeps a newline', ({ assert }) => {
    for (const label of OBSERVED_TREATMENT_PLAN_LABELS) {
      assert.notInclude(normaliseQuestionLabel(label), '\n', label)
    }
  })

  test('goal headings resolve to the same names the sections use', ({ assert }) => {
    assert.equal(
      normaliseQuestionLabel('Goal #1  Target Completion Date'),
      'Goal 1 Target Completion Date'
    )
    assert.equal(
      normaliseQuestionLabel('Goal #4 Target Completion Date'),
      'Goal 4 Target Completion Date'
    )
    assert.equal(
      normaliseQuestionLabel(
        'Objective, Intervention and Status for GOAL #3 (OPTIONAL)\nInstructions: x'
      ),
      'Goal 3 Objectives and Interventions'
    )
  })

  test('an intervention with a letter suffix is not confused with the plain one', ({ assert }) => {
    // "Intervention #1a" and "Intervention #1" are different questions on the
    // form. Matching the plain rule first would collapse them into one key and
    // the second would be stored as "... (2)".
    assert.equal(
      normaliseQuestionLabel('Intervention #1a Completion Date'),
      'Goal 1 Intervention 1a Completion Date'
    )
    assert.equal(
      normaliseQuestionLabel('Intervention #1 Completion Date'),
      'Goal 1 Intervention Completion Date'
    )
    assert.notEqual(
      normaliseQuestionLabel('Intervention #1a Completion Date'),
      normaliseQuestionLabel('Intervention #1 Completion Date')
    )
  })

  test('every normalised goal label is a registered section', ({ assert }) => {
    // A heading with no matching section can never be annotated, which is the
    // failure this whole change exists to remove.
    const sectionNames = new Set(ANNOTATABLE_SECTIONS.map((section) => section.display_name))

    for (const label of OBSERVED_TREATMENT_PLAN_LABELS) {
      assert.isTrue(
        sectionNames.has(normaliseQuestionLabel(label)),
        `${normaliseQuestionLabel(label)} has no section`
      )
    }
  })

  test('the initial plan and the renewal name the same goal the same way', ({ assert }) => {
    // "Tentative Goal 1" on the initial plan and "Treatment Goal  #1" on the 90
    // day renewal are the same box on the form.
    const expected = 'Goal 1 Long-Term Goal'

    assert.equal(normaliseQuestionLabel('Tentative Goal 1'), expected)
    assert.equal(normaliseQuestionLabel('Treatment Goal  #1\nInstructions: x'), expected)
    assert.equal(normaliseQuestionLabel('Tentative treatment Goal 2'), 'Goal 2 Long-Term Goal')
    assert.equal(
      normaliseQuestionLabel('Tentative Treatment Goal 3 (optional)'),
      'Goal 3 Long-Term Goal'
    )
  })

  test('sections on the current forms have somewhere to attach a finding', ({ assert }) => {
    const sectionNames = new Set(ANNOTATABLE_SECTIONS.map((section) => section.display_name))

    for (const name of [
      'Current Diagnosis',
      'Communication Difficulties',
      'Enhanced Communication',
    ]) {
      assert.isTrue(sectionNames.has(name), name)
    }
  })

  test('guidance on its own line is dropped whatever introduces it', ({ assert }) => {
    // The wording is PracticeQ's to change, so nothing here matches on the
    // word Instructions. Anything after a line break is guidance.
    for (const lead of ['Instructions', 'Instruction', 'Note', 'Guidance', 'Please note']) {
      assert.equal(
        normaliseQuestionLabel(`Treatment Goal  #1\n${lead}: enter the goal`),
        'Goal 1 Long-Term Goal',
        lead
      )
    }

    assert.equal(
      normaliseQuestionLabel('Presenting Problem & Symptoms\nGuidance: describe it'),
      'Presenting Problem & Symptoms'
    )
  })

  test('guidance on the same line is cut when the heading runs long', ({ assert }) => {
    // No line break to split on, so length is the signal rather than a keyword.
    assert.equal(
      normaliseQuestionLabel(
        'Presenting Problem Guidance: describe the presenting problem in full with examples'
      ),
      'Presenting Problem Guidance'
    )
  })

  test('a long real section name is not truncated', ({ assert }) => {
    // The longest genuine heading. It must survive the length guard intact.
    const longest = 'Pertinent history as related to presenting problem, trauma, abuse, etc'

    assert.equal(normaliseQuestionLabel(longest), longest)
  })

  test('every registered section name survives normalisation unchanged', ({ assert }) => {
    // A section whose own name does not normalise to itself can never be
    // matched by a finding, which is the failure this all exists to prevent.
    const changed = ANNOTATABLE_SECTIONS.map((section) => section.display_name)
      .filter((name) => !name.startsWith('Goal '))
      .filter((name) => normaliseQuestionLabel(name) !== name)

    assert.deepEqual(changed, [])
  })

  test('an ordinary label is left alone apart from tidying', ({ assert }) => {
    assert.equal(normaliseQuestionLabel('Session Frequency:'), 'Session Frequency:')
    assert.equal(normaliseQuestionLabel('  Family   History  '), 'Family History')
    assert.equal(normaliseQuestionLabel(''), '')
    assert.equal(normaliseQuestionLabel(null), '')
    assert.equal(normaliseQuestionLabel(undefined), '')
  })
})

test.group('Session object field names', () => {
  test('the id map still wins over the label', ({ assert }) => {
    // Progress note names are depended on by the scorer prompt and the
    // frontend field list, so the id map must keep priority.
    const session = buildSessionObject(
      [{ id: '6tx9-1', text: 'Something else entirely', answer: 'text' }],
      SessionTypeEnum.progress_note
    )

    assert.property(session, 'Subjective')
  })

  test('a question with no id map entry falls back to the normalised label', ({ assert }) => {
    const session = buildSessionObject(
      [
        {
          id: 'zzzz-9',
          text: 'Treatment Goal  #2\nInstructions: whatever',
          answer: 'Reduce anxiety',
        },
      ],
      SessionTypeEnum.treatment_plan
    )

    assert.property(session, 'Goal 2 Long-Term Goal')
    assert.equal(session['Goal 2 Long-Term Goal'], 'Reduce anxiety')
  })

  test('no stored field name ever contains a newline', ({ assert }) => {
    const session = buildSessionObject(
      OBSERVED_TREATMENT_PLAN_LABELS.map((text, index) => ({
        id: `unknown-${index}`,
        text,
        answer: 'value',
      })),
      SessionTypeEnum.treatment_plan
    )

    for (const key of Object.keys(session)) {
      assert.notInclude(key, '\n', key)
    }
  })

  test('repeated labels are numbered rather than overwritten', ({ assert }) => {
    const session = buildSessionObject(
      [
        { id: 'a-1', text: 'Status', answer: 'In Progress' },
        { id: 'b-1', text: 'Status', answer: 'Met' },
      ],
      SessionTypeEnum.treatment_plan
    )

    assert.equal(session['Status'], 'In Progress')
    assert.equal(session['Status (2)'], 'Met')
  })
})
