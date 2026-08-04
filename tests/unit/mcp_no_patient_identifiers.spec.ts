import { test } from '@japa/runner'
import { parseSessionForMcp, isPatientIdentifierKey } from '#services/mcp_service'
import { buildMcpScoreNoteRequest } from '#services/mcp_service'
import { SessionTypeEnum } from '#enums/session_enum'

/** An intake as stored, identifiers included, which is how it arrives from PracticeQ. */
const intakeSession = JSON.stringify({
  'First Name:': 'Donnette',
  'Last Name:': 'Gooden',
  'Date of Birth:': '4/25/1995',
  'Initiation date': '07/23/2026',
  'Presenting Problem & Symptoms': 'Reports low mood and poor sleep.',
  'Risk Assessment': 'Passive thoughts, denies intent or plan.',
  'Family History': 'Close to mother and sister.',
})

const identifying = ['Donnette', 'Gooden', '4/25/1995']

test.group('Patient identifiers never reach the scorer', () => {
  test('the identifier keys are recognised whatever the punctuation or case', ({ assert }) => {
    for (const key of [
      'First Name:',
      'first name',
      'LAST NAME',
      'Last Name:',
      'Date of Birth:',
      'date of birth',
      'Date of Birth (optional)',
    ]) {
      assert.isTrue(isPatientIdentifierKey(key), key)
    }
  })

  test('a clinical section is not mistaken for an identifier', ({ assert }) => {
    for (const key of [
      'Presenting Problem & Symptoms',
      'Family History',
      'Risk Assessment',
      'Full Name & Credentials (Signature)',
      'Date Completed',
    ]) {
      assert.isFalse(isPatientIdentifierKey(key), key)
    }
  })

  test('an intake sent to the scorer carries no name and no date of birth', ({ assert }) => {
    const session = parseSessionForMcp(intakeSession, SessionTypeEnum.intake)

    assert.notProperty(session, 'First Name:')
    assert.notProperty(session, 'Last Name:')
    assert.notProperty(session, 'Date of Birth:')
  })

  test('the clinical content is still sent in full', ({ assert }) => {
    // Stripping identifiers must not cost us the sections being reviewed.
    const session = parseSessionForMcp(intakeSession, SessionTypeEnum.intake)

    assert.property(session, 'Presenting Problem & Symptoms')
    assert.property(session, 'Risk Assessment')
    assert.property(session, 'Family History')
    assert.property(session, 'Initiation date')
  })

  test('no identifying value appears anywhere in the request body', ({ assert }) => {
    // Checks the serialised payload rather than the keys, so a value carried
    // under an unexpected key would still be caught.
    const request = buildMcpScoreNoteRequest({
      noteId: 'note-1',
      clientId: 'client-1',
      cptCode: '90791',
      diagnosis: [],
      currentNote: intakeSession,
      previousNote: intakeSession,
      sessionType: SessionTypeEnum.intake,
      noteName: 'Initial Consultation: Intake/Assessment',
    })

    const body = JSON.stringify(request)

    for (const value of identifying) {
      assert.notInclude(body, value, value)
    }
  })

  test('the previous session is stripped too', ({ assert }) => {
    const request = buildMcpScoreNoteRequest({
      noteId: 'note-1',
      clientId: 'client-1',
      cptCode: '90791',
      diagnosis: [],
      currentNote: intakeSession,
      previousNote: intakeSession,
      sessionType: SessionTypeEnum.treatment_plan,
      noteName: 'Initial Consultation: Assessment/Treatment Plan',
    })

    assert.notProperty(request.previous_session ?? {}, 'First Name:')
    assert.notProperty(request.previous_session ?? {}, 'Date of Birth:')
  })

  test('progress notes are unchanged, since their shape never carried identifiers', ({
    assert,
  }) => {
    const session = parseSessionForMcp(
      JSON.stringify({ 'First Name:': 'Donnette', 'Subjective': 'Client presented calm.' }),
      SessionTypeEnum.progress_note
    )

    assert.notProperty(session, 'First Name:')
    assert.equal(session.Subjective, 'Client presented calm.')
  })
})
