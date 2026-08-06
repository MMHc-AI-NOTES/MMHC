import { test } from '@japa/runner'
import { buildSessionObject, isExcludedAdminField } from '#services/note_type_mapping_service'
import { SessionTypeEnum } from '#enums/session_enum'

/** The termination note payload the SME team reviewed, administrative block included. */
const TERMINATION_QUESTIONS = [
  { id: 'uap4-5', text: 'Initiation Date:', answer: '05/18/2026' },
  { id: 'uap4-6', text: 'Review on', answer: '7' },
  { id: 'uap4-7', text: 'days on', answer: '05/25/2026' },
  { id: 'pqkf-1', text: 'Progress Overview:', answer: 'CBT, Solution-Focused Therapy' },
  { id: 't24x-1', text: 'Client Satisfaction Level:', answer: 'Mixed Feelings' },
]

test.group('Administrative fields are excluded from the session', () => {
  test('the scheduling fields are recognised in both wordings', ({ assert }) => {
    assert.isTrue(isExcludedAdminField('Initiation Date:'))
    assert.isTrue(isExcludedAdminField('Initiation date'))
    assert.isTrue(isExcludedAdminField('Review on'))
    assert.isTrue(isExcludedAdminField('days on'))
  })

  test('clinical sections are never mistaken for administrative ones', ({ assert }) => {
    for (const name of [
      'Progress Overview:',
      'Date Completed',
      'Session Duration',
      'Goal 1 Target Completion Date',
      'Date of Birth:',
    ]) {
      assert.isFalse(isExcludedAdminField(name), name)
    }
  })

  test('a termination note stores its clinical fields and drops the scheduling block', ({
    assert,
  }) => {
    const session = buildSessionObject(TERMINATION_QUESTIONS, SessionTypeEnum.termination)

    assert.notProperty(session, 'Initiation Date:')
    assert.notProperty(session, 'Review on')
    assert.notProperty(session, 'days on')
    assert.equal(session['Progress Overview:'], 'CBT, Solution-Focused Therapy')
    assert.equal(session['Client Satisfaction Level:'], 'Mixed Feelings')
  })

  test('an intake drops its Initiation date too', ({ assert }) => {
    const session = buildSessionObject(
      [
        { id: 'ot2p-5', text: 'Initiation date', answer: '03/23/2026' },
        { id: 'h08z-1', text: 'Presenting Problem & Symptoms', answer: 'Reports low mood.' },
      ],
      SessionTypeEnum.intake
    )

    assert.notProperty(session, 'Initiation date')
    assert.property(session, 'Presenting Problem & Symptoms')
  })

  test('progress notes are unaffected, none of their fields are administrative', ({ assert }) => {
    const session = buildSessionObject(
      [
        { id: '6tx9-1', text: 'Subjective', answer: 'Client presented calm.' },
        { id: 'p9m9-1', text: 'Session Duration', answer: '10am-10:53am' },
      ],
      SessionTypeEnum.progress_note
    )

    assert.equal(session['Subjective'], 'Client presented calm.')
    assert.equal(session['Session Duration'], '10am-10:53am')
  })
})
