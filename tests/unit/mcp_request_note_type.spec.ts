import { test } from '@japa/runner'
import { buildMcpScoreNoteRequest } from '#services/mcp_service'
import { sessionTypeSlug } from '#services/note_type_mapping_service'
import { SessionTypeEnum } from '#enums/session_enum'

const build = (sessionType: number | null | undefined, noteName?: string) =>
  buildMcpScoreNoteRequest({
    noteId: 'note-1',
    clientId: 'client-1',
    cptCode: '90837',
    diagnosis: [],
    currentNote: JSON.stringify({ Subjective: 'text' }),
    sessionType,
    noteName,
  })

test.group('Note type on the scorer request', () => {
  test('every note type sends a distinct value to branch on', ({ assert }) => {
    // Without this the scorer cannot tell the types apart and applies the
    // progress note checks to all of them.
    const slugs = [
      SessionTypeEnum.progress_note,
      SessionTypeEnum.intake,
      SessionTypeEnum.treatment_plan,
      SessionTypeEnum.termination,
    ].map((type) => build(type).note_type)

    assert.deepEqual(slugs, ['progress_note', 'intake', 'treatment_plan', 'termination'])
    assert.equal(new Set(slugs).size, 4)
  })

  test('the form name travels alongside the type', ({ assert }) => {
    const request = build(
      SessionTypeEnum.treatment_plan,
      'Initial Consultation: Assessment/Treatment Plan'
    )

    assert.equal(request.note_type, 'treatment_plan')
    assert.equal(request.note_name, 'Initial Consultation: Assessment/Treatment Plan')
  })

  test('an unknown type is named rather than left absent', ({ assert }) => {
    // Sending nothing is what caused this. A value the scorer does not
    // recognise is still better than a missing key.
    assert.equal(build(null).note_type, 'unknown')
    assert.equal(build(undefined).note_type, 'unknown')
    assert.equal(build(99).note_type, 'unknown')
    assert.equal(sessionTypeSlug(null), 'unknown')
  })

  test('a missing form name is an empty string, never undefined', ({ assert }) => {
    const request = build(SessionTypeEnum.intake)

    assert.equal(request.note_name, '')
    assert.property(request, 'note_name')
  })

  test('the existing fields are untouched', ({ assert }) => {
    const request = build(SessionTypeEnum.progress_note, 'Progress Note')

    assert.equal(request.note_id, 'note-1')
    assert.equal(request.client_id, 'client-1')
    assert.equal(request.cpt_code, '90837')
    assert.deepEqual(request.diagnosis, [])
    assert.equal(request.current_session.Subjective, 'text')
  })
})
