import { test } from '@japa/runner'
import { FIELD_MAPPING } from '#services/note_type_mapping_service'
import { ANNOTATABLE_SECTIONS, assertSectionsAreUnique } from '#services/annotatable_sections'

/**
 * The UI keys its section lookup by both display_name and field_id, so a repeat
 * of either silently takes over another section.
 */
const rows = ANNOTATABLE_SECTIONS.map((section) => ({
  id: section.id,
  fieldId: section.field_id,
  displayName: section.display_name,
}))

test.group('Annotatable sections', () => {
  test('the section list is populated', ({ assert }) => {
    assert.isAbove(rows.length, 40)
  })

  test('the uniqueness guard the seeder runs does not throw', ({ assert }) => {
    assert.doesNotThrow(() => assertSectionsAreUnique())
  })

  test('no display name appears twice', ({ assert }) => {
    const names = rows.map((row) => row.displayName)
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index)

    assert.deepEqual(duplicates, [])
  })

  test('no field id appears twice', ({ assert }) => {
    const ids = rows.map((row) => row.fieldId)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)

    assert.deepEqual(duplicates, [])
  })

  test('no id appears twice', ({ assert }) => {
    const ids = rows.map((row) => row.id)

    assert.equal(new Set(ids).size, ids.length)
  })

  test('progress note sections keep ids 1 to 13', ({ assert }) => {
    // sme_issues_tamplate and every existing SME issue point at these.
    const original = rows.filter((row) => row.id <= 13)

    assert.lengthOf(original, 13)
    assert.equal(original.find((row) => row.id === 3)?.displayName, 'Subjective')
    assert.equal(original.find((row) => row.id === 5)?.fieldId, 'zad8-1')
    assert.equal(original.find((row) => row.id === 13)?.fieldId, 'overall')
  })

  test('every progress note field still resolves to its original section', ({ assert }) => {
    // A new row taking one of these names would change where progress note
    // findings and SME issues land.
    const byName = new Map(rows.map((row) => [row.displayName, row.id]))

    assert.equal(byName.get('Subjective'), 3)
    assert.equal(byName.get('Objective'), 4)
    assert.equal(byName.get('Assessment & Therapeutic Intervention'), 5)
    assert.equal(byName.get('Plan and Collaboration'), 7)
    assert.equal(byName.get('Progress'), 9)
    assert.equal(byName.get('Mental Status'), 2)
    assert.equal(byName.get('Overall'), 13)
  })

  test('mental status is not duplicated for intake', ({ assert }) => {
    const mentalStatus = rows.filter((row) => row.displayName.startsWith('Mental Status'))

    assert.lengthOf(mentalStatus, 1)
    assert.equal(mentalStatus[0].id, 2)
  })

  test('intake sections are registered', ({ assert }) => {
    const names = rows.map((row) => row.displayName)

    for (const section of [
      'Presenting Problem & Symptoms',
      'Bio/Psychosocial Assessment',
      'Family History',
      'Risk Assessment',
      'Strengths',
      'Tenative Goals and Plans',
      'Involvement',
    ]) {
      assert.include(names, section)
    }
  })

  test('termination sections are registered', ({ assert }) => {
    const names = rows.map((row) => row.displayName)

    for (const section of [
      'Treatment Goals & Objectives:',
      'Progress Overview:',
      'Client Satisfaction Level:',
      'Engagement Level:',
      'Progress and Growth Areas:',
    ]) {
      assert.include(names, section)
    }
  })

  test('a section shared by two note types has one row, not two', ({ assert }) => {
    for (const shared of [
      'First Name:',
      'Last Name:',
      'Date of Birth:',
      'Encounter Type & Method',
    ]) {
      assert.lengthOf(
        rows.filter((row) => row.displayName === shared),
        1
      )
    }
  })

  test('no new row reuses a progress note field id', ({ assert }) => {
    const progressFieldIds = new Set(Object.keys(FIELD_MAPPING))
    const clashes = rows.filter((row) => row.id > 13 && progressFieldIds.has(row.fieldId))

    assert.deepEqual(clashes, [])
  })
})

test.group('Treatment plan sections', () => {
  const byName = new Map(rows.map((row) => [row.displayName, row.id]))

  test('every goal field is registered by its own name', ({ assert }) => {
    for (const goal of [1, 2, 3, 4]) {
      for (const field of [
        'Long-Term Goal',
        'Target Completion Date',
        'Status',
        'Short-Term Objective 1',
        'Primary Clinical Intervention',
        'Notes',
      ]) {
        assert.exists(byName.get(`Goal ${goal} ${field}`), `Goal ${goal} ${field}`)
      }
    }
  })

  test('a goal field matches exactly and never falls through to another section', ({ assert }) => {
    // Registering only "Goal 1" and relying on substring matching sent
    // "Goal 2 Short-Term Objective 1" to the progress note Objective section,
    // because the fallback matches on any shared word.
    const resolve = (fieldKey: string) => {
      const exact = byName.get(fieldKey)
      if (exact) return exact
      const lower = fieldKey.toLowerCase()
      for (const [name, id] of byName.entries()) {
        const mapKey = name.toLowerCase()
        if (mapKey.includes(lower) || lower.includes(mapKey)) return id
      }
      return null
    }

    assert.equal(
      resolve('Goal 2 Short-Term Objective 1'),
      byName.get('Goal 2 Short-Term Objective 1')
    )
    assert.notEqual(resolve('Goal 2 Short-Term Objective 1'), byName.get('Objective'))
    assert.equal(resolve('Goal 3 Status'), byName.get('Goal 3 Status'))
    assert.equal(resolve('Goal 1 Notes'), byName.get('Goal 1 Notes'))
  })

  test('Progress Since Last Plan does not fall through to the progress note section', ({
    assert,
  }) => {
    // Without its own row the substring fallback would match "Progress", id 9.
    assert.exists(byName.get('Progress Since Last Plan'))
    assert.notEqual(byName.get('Progress Since Last Plan'), 9)
  })

  test('the referral question is named rather than left as a raw id', ({ assert }) => {
    assert.exists(byName.get('Referral for Additional Services?'))
  })

  test('treatment plan sections are registered', ({ assert }) => {
    for (const section of [
      'Session Frequency:',
      'Expected Duration:',
      'Treatment Modality',
      'Primary Clinical Approach',
      'Secondary Clinical Approach',
      'Tenative Goals & Plans:',
    ]) {
      assert.exists(byName.get(section))
    }
  })
})
