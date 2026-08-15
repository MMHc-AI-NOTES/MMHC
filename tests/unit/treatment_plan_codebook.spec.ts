import { test } from '@japa/runner'
import {
  TREATMENT_PLAN_CODEBOOK,
  TREATMENT_PLAN_CODEBOOK_SECTIONS,
  isGoalSectionName,
  assertTreatmentPlanCodebookIsConsistent,
} from '#services/treatment_plan_codebook'
import { PROGRESS_NOTE_CODEBOOK } from '#services/progress_note_codebook'
import { ANNOTATABLE_SECTIONS } from '#services/annotatable_sections'

test.group('Treatment plan codebook', () => {
  test('holds exactly the 18 codes from the client document', ({ assert }) => {
    assert.lengthOf(TREATMENT_PLAN_CODEBOOK, 18)

    const ids = TREATMENT_PLAN_CODEBOOK.map((e) => e.descriptionId)
    assert.deepEqual(ids, [
      'ref_1',
      'fre_1',
      'pri_1',
      'sec_1',
      'goa_1',
      'goa_2',
      'goa_3',
      'goa_4',
      'goa_5',
      'goa_6',
      'goa_7',
      'goa_8',
      'goa_9',
      'goa_10',
      'goa_11',
      'ove_9',
      'ove_10',
      'ove_11',
    ])
  })

  test('severities follow the document', ({ assert }) => {
    const severityOf = new Map(TREATMENT_PLAN_CODEBOOK.map((e) => [e.descriptionId, e.severity]))

    assert.equal(severityOf.get('goa_2'), 'critical')
    assert.equal(severityOf.get('goa_5'), 'critical')
    assert.equal(severityOf.get('goa_6'), 'moderate')
    assert.equal(severityOf.get('goa_7'), 'moderate')
    assert.equal(severityOf.get('goa_11'), 'minor')
    assert.equal(severityOf.get('ove_10'), 'critical')
    assert.equal(severityOf.get('ove_11'), 'moderate')
  })

  test('no id collides with the progress note codebook', ({ assert }) => {
    const progressNoteIds = new Set(PROGRESS_NOTE_CODEBOOK.map((e) => e.descriptionId))
    const colliding = TREATMENT_PLAN_CODEBOOK.map((e) => e.descriptionId).filter((id) =>
      progressNoteIds.has(id)
    )

    assert.deepEqual(colliding, [])
  })

  test('every section the codebook names is a registered section', ({ assert }) => {
    const registered = new Set(ANNOTATABLE_SECTIONS.map((s) => s.display_name))

    for (const name of TREATMENT_PLAN_CODEBOOK_SECTIONS) {
      assert.isTrue(registered.has(name), name)
    }
    for (const entry of TREATMENT_PLAN_CODEBOOK) {
      assert.isTrue(registered.has(entry.section), entry.section)
    }
  })

  test('goal sections are recognised for clearing, others are not', ({ assert }) => {
    assert.isTrue(isGoalSectionName('Goal 1 Long-Term Goal'))
    assert.isTrue(isGoalSectionName('Goal 6 Intervention 6a Completion Date'))
    assert.isFalse(isGoalSectionName('Overall'))
    assert.isFalse(isGoalSectionName('Tenative Goals & Plans:'))
  })

  test('the consistency assertion passes on the shipped codebook', ({ assert }) => {
    assert.doesNotThrow(() => assertTreatmentPlanCodebookIsConsistent())
  })
})
