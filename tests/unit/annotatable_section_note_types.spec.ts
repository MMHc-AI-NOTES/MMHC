import { test } from '@japa/runner'
import { ANNOTATABLE_SECTIONS, SECTION_NOTE_TYPES } from '#services/annotatable_sections'

test.group('Section note types', () => {
  test('every section declares which template family it belongs to', ({ assert }) => {
    const allowed = new Set<string>(SECTION_NOTE_TYPES)
    const missing = ANNOTATABLE_SECTIONS.filter(
      (section) => !section.note_type || !allowed.has(section.note_type)
    ).map((section) => section.display_name)

    assert.deepEqual(missing, [])
  })

  test('the known anchors sit in the right families', ({ assert }) => {
    const typeOf = new Map(ANNOTATABLE_SECTIONS.map((s) => [s.display_name, s.note_type]))

    assert.equal(typeOf.get('Subjective'), 'progress_note')
    assert.equal(typeOf.get('Presenting Problem & Symptoms'), 'intake')
    assert.equal(typeOf.get("Client's Reflections:"), 'termination')
    assert.equal(typeOf.get('Tenative Goals & Plans:'), 'treatment_plan')
    assert.equal(typeOf.get('Goal 6 Long-Term Goal'), 'treatment_plan')
    assert.equal(typeOf.get('First Name:'), 'shared')
    assert.equal(typeOf.get('Current Diagnosis'), 'shared')
  })
})
