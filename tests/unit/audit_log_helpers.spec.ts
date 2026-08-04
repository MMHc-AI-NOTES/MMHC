import { test } from '@japa/runner'
import { getDiagnosisFromAuditLog, getNoteNameFromAuditLog } from '#services/note_service'

test.group('note_service | Audit log helpers & edge cases', () => {
  test('getDiagnosisFromAuditLog returns empty array when noteId is empty or invalid', async ({
    assert,
  }) => {
    assert.deepEqual(await getDiagnosisFromAuditLog(''), [])
    assert.deepEqual(await getDiagnosisFromAuditLog('   '), [])
    assert.deepEqual(await getDiagnosisFromAuditLog(null as any), [])
    assert.deepEqual(await getDiagnosisFromAuditLog(undefined as any), [])
    assert.deepEqual(await getDiagnosisFromAuditLog(12345 as any), [])
  })

  test('getNoteNameFromAuditLog returns empty string when noteId is empty or invalid', async ({
    assert,
  }) => {
    assert.equal(await getNoteNameFromAuditLog(''), '')
    assert.equal(await getNoteNameFromAuditLog('   '), '')
    assert.equal(await getNoteNameFromAuditLog(null as any), '')
    assert.equal(await getNoteNameFromAuditLog(undefined as any), '')
    assert.equal(await getNoteNameFromAuditLog(12345 as any), '')
  })
})
