import { test } from '@japa/runner'
import { SessionTypeEnum } from '#enums/session_enum'
import { resolveSessionType, buildSessionObject } from '#services/note_type_mapping_service'

test.group('note_type_mapping_service | resolveSessionType', () => {
  test('resolves all four confirmed note-type labels', ({ assert }) => {
    assert.deepEqual(resolveSessionType('Progress Note'), {
      type: SessionTypeEnum.progress_note,
      matched: true,
    })
    assert.deepEqual(resolveSessionType('Initial Consultation: Intake/Assessment'), {
      type: SessionTypeEnum.intake,
      matched: true,
    })
    assert.deepEqual(resolveSessionType('Initial Consultation: Assessment/Treatment Plan'), {
      type: SessionTypeEnum.treatment_plan,
      matched: true,
    })
    assert.deepEqual(resolveSessionType('Termination Note'), {
      type: SessionTypeEnum.termination,
      matched: true,
    })
  })

  test('is case-insensitive and trims whitespace', ({ assert }) => {
    assert.equal(resolveSessionType('  termination note  ').type, SessionTypeEnum.termination)
    assert.equal(resolveSessionType('PROGRESS NOTE').type, SessionTypeEnum.progress_note)
  })

  test('falls back via fuzzy substring match for label variants', ({ assert }) => {
    assert.equal(resolveSessionType('Progress Note - Adult').type, SessionTypeEnum.progress_note)
    assert.equal(
      resolveSessionType('Initial Consultation: Assessment/Treatment Plan (Revised)').type,
      SessionTypeEnum.treatment_plan
    )
    assert.equal(resolveSessionType('Client Discharge Summary').type, SessionTypeEnum.termination)
  })

  test('a missing/blank label confidently defaults to progress_note (matched: true)', ({
    assert,
  }) => {
    assert.deepEqual(resolveSessionType(undefined), {
      type: SessionTypeEnum.progress_note,
      matched: true,
    })
    assert.deepEqual(resolveSessionType(''), {
      type: SessionTypeEnum.progress_note,
      matched: true,
    })
    assert.deepEqual(resolveSessionType('   '), {
      type: SessionTypeEnum.progress_note,
      matched: true,
    })
  })

  test('an unrecognized non-blank label defaults to progress_note but matched: false', ({
    assert,
  }) => {
    const result = resolveSessionType('Some Totally New Note Type', 'note-123')
    assert.equal(result.type, SessionTypeEnum.progress_note)
    assert.isFalse(result.matched)
  })
})

test.group('note_type_mapping_service | buildSessionObject', () => {
  test('maps progress-note ids to their canonical field names', ({ assert }) => {
    const result = buildSessionObject(
      [
        { id: '6tx9-1', text: 'Subjective', answer: 'Client felt calm.' },
        { id: 'rb2f-1', text: 'Objective', answer: 'Alert and engaged.' },
      ],
      SessionTypeEnum.progress_note
    )
    assert.deepEqual(result, {
      Subjective: 'Client felt calm.',
      Objective: 'Alert and engaged.',
    })
  })

  test('maps intake-note ids to their canonical field names', ({ assert }) => {
    const result = buildSessionObject(
      [
        { id: 'h08z-1', text: 'Presenting Problem & Symptoms', answer: 'Anxiety.' },
        { id: 'kxgx-1', text: 'Risk Assessment', answer: 'No risk identified.' },
      ],
      SessionTypeEnum.intake
    )
    assert.deepEqual(result, {
      'Presenting Problem & Symptoms': 'Anxiety.',
      'Risk Assessment': 'No risk identified.',
    })
  })

  test('the same question id resolves differently depending on note type (id collision)', ({
    assert,
  }) => {
    const progress = buildSessionObject(
      [{ id: 'zad8-1', text: 'Assessment & Therapeutic Intervention', answer: 'A' }],
      SessionTypeEnum.progress_note
    )
    const intake = buildSessionObject(
      [{ id: 'zad8-1', text: 'Tenative Goals and Plans', answer: 'B' }],
      SessionTypeEnum.intake
    )
    assert.deepEqual(progress, { 'Assessment & Therapeutic Intervention': 'A' })
    assert.deepEqual(intake, { 'Tenative Goals and Plans': 'B' })
  })

  test('termination-note ids map to their canonical field names', ({ assert }) => {
    const result = buildSessionObject(
      [
        { id: 'pqkf-1', text: 'Progress Overview:', answer: 'Client met goals.' },
        { id: 't24x-1', text: 'Client Satisfaction Level:', answer: 'High' },
      ],
      SessionTypeEnum.termination
    )
    assert.deepEqual(result, {
      'Progress Overview:': 'Client met goals.',
      'Client Satisfaction Level:': 'High',
    })
  })

  test('treatment-plan (no id map) falls back to question text', ({ assert }) => {
    const result = buildSessionObject(
      [{ id: 'koai-1', text: 'Long-Term Goal', answer: 'Reduce anxiety.' }],
      SessionTypeEnum.treatment_plan
    )
    assert.deepEqual(result, { 'Long-Term Goal': 'Reduce anxiety.' })
  })

  test('repeated field labels across goal blocks are preserved, not overwritten', ({ assert }) => {
    // Mirrors the real treatment-plan template: "Status" and "Target Completion
    // Date (within 3 months)" repeat once per goal block (up to 4 goals).
    const result = buildSessionObject(
      [
        { id: 'koai-5', text: 'Status', answer: 'In progress' },
        { id: 'koai-11', text: 'Status', answer: 'Met' },
        { id: 'has1-5', text: 'Status', answer: 'Not started' },
      ],
      SessionTypeEnum.treatment_plan
    )
    assert.deepEqual(result, {
      Status: 'In progress',
      'Status (2)': 'Met',
      'Status (3)': 'Not started',
    })
  })

  test('blank question text falls back to the raw id, not an empty key', ({ assert }) => {
    const result = buildSessionObject(
      [{ id: '425q-1', text: '', answer: 'Yes' }],
      SessionTypeEnum.treatment_plan
    )
    assert.deepEqual(result, { '425q-1': 'Yes' })
  })

  test('an unmatched/unknown type does not apply the progress-note id map', ({ assert }) => {
    // Simulates a caller passing `undefined` because resolveSessionType
    // returned matched: false — id lookup must be skipped entirely so an
    // unknown note type's ids can't collide with progress-note field names.
    const result = buildSessionObject(
      [{ id: 'zad8-1', text: 'Some Unrelated Field On An Unknown Note Type', answer: 'X' }],
      undefined
    )
    assert.deepEqual(result, { 'Some Unrelated Field On An Unknown Note Type': 'X' })
  })

  test('non-string answers (boolean, number, array) are formatted to strings', ({ assert }) => {
    const result = buildSessionObject([
      { id: 'a', text: 'Checkbox Field', answer: false as any },
      { id: 'b', text: 'Count Field', answer: 0 as any },
      { id: 'c', text: 'Multi Select', answer: ['Option A', 'Option B'] as any },
    ])
    assert.deepEqual(result, {
      'Checkbox Field': 'false',
      'Count Field': '0',
      'Multi Select': 'Option A, Option B',
    })
  })

  test('handles missing/non-array questions gracefully', ({ assert }) => {
    assert.deepEqual(buildSessionObject(undefined), {})
    assert.deepEqual(buildSessionObject(null), {})
    assert.deepEqual(buildSessionObject([]), {})
  })
})
