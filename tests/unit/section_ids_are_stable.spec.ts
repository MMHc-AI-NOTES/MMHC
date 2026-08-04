import { test } from '@japa/runner'
import { ANNOTATABLE_SECTIONS } from '#services/annotatable_sections'
import { PINNED_SECTION_IDS } from '../fixtures/section_ids.js'

/**
 * A section id is a permanent identifier. Every SME issue and every template
 * row points at one, so moving an id repoints existing findings at a different
 * section, and nothing at runtime would report it.
 *
 * tests/fixtures/section_ids.ts records the id every section name holds
 * today. Do not regenerate it to make this pass. A new section takes the next
 * free id and is added to the fixture. A section that has to move needs a
 * migration for the rows that reference it.
 */
const pinned = PINNED_SECTION_IDS

test.group('Section ids are stable', () => {
  test('no section has moved to a different id', ({ assert }) => {
    const moved: string[] = []

    for (const section of ANNOTATABLE_SECTIONS) {
      const expected = pinned[section.display_name]
      if (expected !== undefined && expected !== section.id) {
        moved.push(`${section.display_name}: was ${expected}, now ${section.id}`)
      }
    }

    assert.deepEqual(moved, [], 'Existing findings point at these ids')
  })

  test('no section has been removed', ({ assert }) => {
    const present = new Set(ANNOTATABLE_SECTIONS.map((section) => section.display_name))
    const missing = Object.keys(pinned).filter((name) => !present.has(name))

    assert.deepEqual(missing, [], 'Removing a section orphans the findings attached to it')
  })

  test('a new section is added to the fixture', ({ assert }) => {
    // Keeps the fixture honest. Without this a section could be added and never
    // pinned, so it could move freely afterwards.
    const unpinned = ANNOTATABLE_SECTIONS.filter(
      (section) => pinned[section.display_name] === undefined
    ).map((section) => `${section.display_name} (${section.id})`)

    assert.deepEqual(unpinned, [], 'Add these to tests/fixtures/section_ids.ts')
  })

  test('the ids a goal field holds are the ones already in the database', ({ assert }) => {
    // Spot check across the range rather than trusting the fixture alone.
    const byName = new Map(ANNOTATABLE_SECTIONS.map((s) => [s.display_name, s.id]))

    assert.equal(byName.get('Goal 1 Long-Term Goal'), 60)
    assert.equal(byName.get('Goal 2 Long-Term Goal'), 74)
    assert.equal(byName.get('Goal 4 Intervention Completion Date'), 115)
    assert.equal(byName.get('Goal 1 Intervention 1a Completion Date'), 116)
    assert.equal(byName.get('Goal 4 Intervention 4a Completion Date'), 119)
  })

  test('the id a new section should take is the next free one', ({ assert }) => {
    const used = new Set(ANNOTATABLE_SECTIONS.map((section) => section.id))
    const highest = Math.max(...used)

    assert.equal(highest, 119)
    assert.isFalse(used.has(120), 'A new section takes 120, not a gap in the middle')
  })
})
