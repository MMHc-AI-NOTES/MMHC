import { test } from '@japa/runner'
import { flattenTableAnswer, extractTableAnswers } from '#services/practiceq_api_service'

test.group('Flattening a PracticeQ table answer', () => {
  test('a row of named cells becomes one readable line', ({ assert }) => {
    const text = flattenTableAnswer({
      id: 'l97s-1',
      text: 'Mental Status',
      rows: [
        {
          Appearance: 'unkempt',
          Orientation: 'WNL (within normal limits)',
          Behavior: 'guarded',
          Affect: 'flat',
        },
      ],
    })

    assert.equal(
      text,
      'Appearance: unkempt | Orientation: WNL (within normal limits) | Behavior: guarded | Affect: flat'
    )
  })

  test('array rows are paired with column names when provided', ({ assert }) => {
    const text = flattenTableAnswer({
      id: 'l97s-1',
      columns: ['Appearance', 'Orientation'],
      rows: [['unkempt', 'WNL']],
    })

    assert.equal(text, 'Appearance: unkempt | Orientation: WNL')
  })

  test('several rows become several lines', ({ assert }) => {
    const text = flattenTableAnswer({
      id: 'fvuz-1',
      rows: [{ Goal: 'Obtain housing' }, { Goal: 'Maintain employment' }],
    })

    assert.equal(text, 'Goal: Obtain housing\nGoal: Maintain employment')
  })

  test('a plain answer passes through untouched', ({ assert }) => {
    assert.equal(flattenTableAnswer({ id: 'x', answer: 'Video Telehealth' }), 'Video Telehealth')
  })

  test('empty cells are dropped rather than rendered as blanks', ({ assert }) => {
    const text = flattenTableAnswer({
      id: 'l97s-1',
      rows: [{ Appearance: 'unkempt', Orientation: '', Mood: null }],
    })

    assert.equal(text, 'Appearance: unkempt')
  })

  test('a question with nothing usable yields an empty string, never junk', ({ assert }) => {
    assert.equal(flattenTableAnswer({ id: 'x' }), '')
    assert.equal(flattenTableAnswer({ id: 'x', rows: [] }), '')
    assert.equal(flattenTableAnswer({ id: 'x', rows: [null, ''] as any }), '')
  })
})

test.group('Extracting table answers from a full note', () => {
  test('only questions that produce text are returned', ({ assert }) => {
    const answers = extractTableAnswers({
      Questions: [
        { id: 'l97s-1', text: 'Mental Status', rows: [{ Appearance: 'unkempt' }] },
        { id: 'h08z-1', text: 'Presenting Problem & Symptoms', answer: 'Reports low mood.' },
        { id: 'c5zm-1', text: 'If yes, please explain' },
      ],
    })

    assert.equal(answers['l97s-1'], 'Appearance: unkempt')
    assert.equal(answers['h08z-1'], 'Reports low mood.')
    assert.notProperty(answers, 'c5zm-1')
  })

  test('a note with no questions yields nothing rather than throwing', ({ assert }) => {
    assert.deepEqual(extractTableAnswers({}), {})
    assert.deepEqual(extractTableAnswers({ Questions: [] }), {})
  })
})
