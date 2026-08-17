import { test } from '@japa/runner'
import {
  PROGRESS_NOTE_CODEBOOK,
  CODEBOOK_SECTIONS,
  assertCodebookIsConsistent,
} from '#services/progress_note_codebook'
import { ANNOTATABLE_SECTIONS } from '#services/annotatable_sections'

test.group('The progress note codebook', () => {
  test('holds the sixty three entries the client provided', ({ assert }) => {
    assert.lengthOf(PROGRESS_NOTE_CODEBOOK, 63)
  })

  test('every description id is unique, the consistency guard passes', ({ assert }) => {
    assert.doesNotThrow(() => assertCodebookIsConsistent())
  })

  test('every section it names is a registered annotatable section', ({ assert }) => {
    const known = new Set(ANNOTATABLE_SECTIONS.map((s) => s.display_name))
    const missing = CODEBOOK_SECTIONS.filter((name) => !known.has(name))

    assert.deepEqual(missing, [])
  })

  test('the section counts match the document', ({ assert }) => {
    const countFor = (section: string) =>
      PROGRESS_NOTE_CODEBOOK.filter((e) => e.section === section).length

    assert.equal(countFor('Overall'), 8)
    assert.equal(countFor('Session Duration'), 1)
    assert.equal(countFor('Mental Status'), 1)
    assert.equal(countFor('Suicidality'), 2)
    assert.equal(countFor('Homicidality'), 1)
    assert.equal(countFor('Subjective'), 11)
    assert.equal(countFor('Objective'), 6)
    assert.equal(countFor('Assessment & Therapeutic Intervention'), 15)
    assert.equal(countFor('Reaction to Intervention'), 8)
    assert.equal(countFor('Plan and Collaboration'), 10)
  })

  test('spot checks against the document, including the ids that changed meaning', ({ assert }) => {
    const byId = new Map(PROGRESS_NOTE_CODEBOOK.map((e) => [e.descriptionId, e]))

    // sub_1 previously meant Templated/boilerplate. It is now Not specific to
    // date of service, at moderate.
    assert.equal(byId.get('sub_1')?.description, 'Not specific to date of service')
    assert.equal(byId.get('sub_1')?.severity, 'moderate')

    // ove_4 is the critical missing field entry, previously held by ove_2.
    assert.equal(
      byId.get('ove_4')?.description,
      'Missing required field (including N/A or the likes)'
    )
    assert.equal(byId.get('ove_4')?.severity, 'critical')

    assert.equal(byId.get('ses_1')?.description, 'Duration mismatch with CPT code')
    assert.equal(byId.get('ass_15')?.severity, 'minor')
    assert.equal(byId.get('pla_10')?.descriptionId, 'pla_10')
  })

  test('the rec_ prefix entries are preserved exactly as the client wrote them', ({ assert }) => {
    // Reaction to Intervention switches prefix from rea to rec at entry six in
    // the provided document. The ids must match the scorer verbatim, so they
    // are kept, not corrected.
    const reaction = PROGRESS_NOTE_CODEBOOK.filter(
      (e) => e.section === 'Reaction to Intervention'
    ).map((e) => e.descriptionId)

    assert.deepEqual(reaction, [
      'rea_1',
      'rea_2',
      'rea_3',
      'rea_4',
      'rea_5',
      'rec_6',
      'rec_7',
      'rec_8',
    ])
  })

  test('every severity carries the points the document states', ({ assert }) => {
    // The document prices minor at 5, moderate at 15 and critical at 25,
    // matching the error_types table. Nothing in the codebook may imply
    // otherwise, so severities must be one of exactly these three.
    const severities = new Set(PROGRESS_NOTE_CODEBOOK.map((e) => e.severity))

    assert.deepEqual([...severities].sort(), ['critical', 'minor', 'moderate'])
  })
})
