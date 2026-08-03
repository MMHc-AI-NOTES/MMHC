import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { FIELD_MAPPING } from '#services/note_type_mapping_service'

/**
 * The UI keys its section lookup by both display_name and field_id, so a repeat
 * of either silently takes over another section. These read the seeder as text
 * rather than running it, so they need no database.
 */
const seeder = readFileSync('database/seeders/7_issues_related_to_seeder.ts', 'utf8')

const rows = [
  ...seeder.matchAll(
    /id:\s*(\d+),\s*\n?\s*field_id:\s*'([^']+)',\s*\n?\s*display_name:\s*(?:'([^']*)'|"([^"]*)")/g
  ),
].map((match) => ({
  id: Number(match[1]),
  fieldId: match[2],
  displayName: match[3] ?? match[4],
}))

test.group('Annotatable sections', () => {
  test('the seeder parses into rows', ({ assert }) => {
    assert.isAbove(rows.length, 40)
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
