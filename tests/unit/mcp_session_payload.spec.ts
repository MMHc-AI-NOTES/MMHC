import { test } from '@japa/runner'
import { parseSessionForMcp } from '#services/mcp_service'
import { SessionTypeEnum } from '#enums/session_enum'

/** Progress notes must stay byte identical; other types send their own sections. */

const progressNote = {
  'Subjective': 'Client presented calm.',
  'Objective': 'Alert and oriented.',
  'Assessment & Therapeutic Intervention': 'CBT techniques used.',
  'Plan and Collaboration': 'Continue weekly.',
  'Therapist Initials': 'JD, LMHC',
}

const intakeNote = {
  'First Name:': 'Alex',
  'Presenting Problem & Symptoms': 'Reports anxiety and poor sleep.',
  'Bio/Psychosocial Assessment': 'No prior treatment history.',
  'Family History': 'Three siblings.',
  'Risk Assessment': 'No risk identified.',
}

const PROGRESS_KEYS = [
  'Subjective',
  'Objective',
  'Assessment & Therapeutic Intervention',
  'Reaction to Intervention',
  'Plan and Collaboration',
  'Session Duration',
  'Mental Status (optional)',
  'Suicidality',
  'Homicidality',
  'Therapist Reflection and Insight (optional)',
  'Overall',
  'Therapist Initials',
]

test.group('Scorer payload | progress notes are unchanged', () => {
  test('still sends exactly the twelve progress sections', ({ assert }) => {
    const result = parseSessionForMcp(JSON.stringify(progressNote), SessionTypeEnum.progress_note)

    assert.deepEqual(Object.keys(result).sort(), [...PROGRESS_KEYS].sort())
  })

  test('still sends absent sections as empty strings', ({ assert }) => {
    const result = parseSessionForMcp(JSON.stringify(progressNote), SessionTypeEnum.progress_note)

    assert.equal(result['Suicidality'], '')
    assert.equal(result['Session Duration'], '')
  })

  test('carries the values through untouched', ({ assert }) => {
    const result = parseSessionForMcp(JSON.stringify(progressNote), SessionTypeEnum.progress_note)

    assert.equal(result['Subjective'], 'Client presented calm.')
    assert.equal(result['Therapist Initials'], 'JD, LMHC')
  })

  test('an unknown note type is treated as a progress note', ({ assert }) => {
    const result = parseSessionForMcp(JSON.stringify(progressNote), 99)
    const legacy = parseSessionForMcp(JSON.stringify(progressNote), SessionTypeEnum.progress_note)

    assert.deepEqual(result, legacy)
  })

  test('a missing note type is treated as a progress note', ({ assert }) => {
    const legacy = parseSessionForMcp(JSON.stringify(progressNote), SessionTypeEnum.progress_note)

    assert.deepEqual(parseSessionForMcp(JSON.stringify(progressNote)), legacy)
    assert.deepEqual(parseSessionForMcp(JSON.stringify(progressNote), null), legacy)
  })

  test('drops fields that are not progress sections, as before', ({ assert }) => {
    const withExtra = { ...progressNote, 'Family History': 'should not be sent' }
    const result = parseSessionForMcp(JSON.stringify(withExtra), SessionTypeEnum.progress_note)

    assert.notProperty(result, 'Family History')
  })
})

test.group('Scorer payload | other note types', () => {
  test('an intake note sends its own sections', ({ assert }) => {
    const result = parseSessionForMcp(JSON.stringify(intakeNote), SessionTypeEnum.intake)

    assert.property(result, 'Presenting Problem & Symptoms')
    assert.property(result, 'Risk Assessment')
    assert.equal(result['Family History'], 'Three siblings.')
  })

  test('an intake note no longer arrives as a blank progress note', ({ assert }) => {
    const result = parseSessionForMcp(JSON.stringify(intakeNote), SessionTypeEnum.intake)

    assert.notProperty(result, 'Subjective')
    assert.notProperty(result, 'Reaction to Intervention')
    assert.isAbove(Object.keys(result).length, 0)
  })

  test('treatment plan and termination follow the same path', ({ assert }) => {
    const plan = parseSessionForMcp(
      JSON.stringify({ 'Goal 1 Long-Term Goal': 'Reduce anxiety.' }),
      SessionTypeEnum.treatment_plan
    )
    const termination = parseSessionForMcp(
      JSON.stringify({ 'Progress Overview:': 'Goals met.' }),
      SessionTypeEnum.termination
    )

    assert.equal(plan['Goal 1 Long-Term Goal'], 'Reduce anxiety.')
    assert.equal(termination['Progress Overview:'], 'Goals met.')
  })

  test('omits empty sections rather than sending blanks', ({ assert }) => {
    const result = parseSessionForMcp(
      JSON.stringify({ 'Family History': 'Three siblings.', 'Cultural Variables?': '   ' }),
      SessionTypeEnum.intake
    )

    assert.notProperty(result, 'Cultural Variables?')
    assert.property(result, 'Family History')
  })

  test('ignores a field with a blank name', ({ assert }) => {
    const result = parseSessionForMcp(
      JSON.stringify({ '': 'orphan value', 'Strengths': 'Resilience.' }),
      SessionTypeEnum.intake
    )

    assert.notInclude(Object.keys(result), '')
    assert.property(result, 'Strengths')
  })

  test('coerces non string values rather than dropping them', ({ assert }) => {
    const result = parseSessionForMcp(
      JSON.stringify({ 'Review on': 90 }),
      SessionTypeEnum.treatment_plan
    )

    assert.equal(result['Review on'], '90')
  })
})

test.group('Scorer payload | malformed input', () => {
  test('an empty note produces an empty payload, not a crash', ({ assert }) => {
    assert.deepEqual(parseSessionForMcp('', SessionTypeEnum.intake), {} as any)
    assert.deepEqual(parseSessionForMcp(null, SessionTypeEnum.intake), {} as any)
  })

  test('unparseable content is still handled for a progress note', ({ assert }) => {
    const result = parseSessionForMcp('not json at all', SessionTypeEnum.progress_note)

    assert.deepEqual(Object.keys(result).sort(), [...PROGRESS_KEYS].sort())
  })
})
