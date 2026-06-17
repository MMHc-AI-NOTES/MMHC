import Session from '#models/session'
import Patient from '#models/patient'

/**
 * Resolve the previous note's session JSON/text for a given session row.
 *
 * 1. Parent-child chain: older note where parent_note_id = current.id
 * 2. Fallback: same patient (via patient_id or patient.client_id), most recent
 *    session before current session_time
 */
// export async function resolvePreviousSessionContent(
//   session: Session
// ): Promise<string | undefined> {
//   const viaChain = await Session.query().where('parent_note_id', session.id).first()

//   if (viaChain?.session?.trim()) {
//     return viaChain.session
//   }

//   if (!session.patient && session.patientId) {
//     await session.load('patient')
//   }

//   const patientId = session.patientId
//   const clientId = session.patient?.clientId?.trim()

//   if (!patientId && !clientId) {
//     return undefined
//   }

//   let resolvedPatientId = patientId

//   if (!resolvedPatientId && clientId) {
//     const patient = await Patient.findBy('client_id', clientId)
//     resolvedPatientId = patient?.id ?? null
//   }

//   if (!resolvedPatientId) {
//     return undefined
//   }

//   let query = Session.query()
//     .where('patient_id', resolvedPatientId)
//     .whereNot('id', session.id)
//     .orderBy('session_time', 'desc')
//     .orderBy('id', 'desc')

//   if (session.sessionTime?.isValid) {
//     query = query.where('session_time', '<', session.sessionTime.toSQL()!)
//   }

//   const previous = await query.first()
//   return previous?.session?.trim() || undefined
// }
export async function resolvePreviousSessionContent(session: Session): Promise<string | undefined> {
  // ── Step 1: follow the parent_note_id pointer UP the chain ────────────────
  // Bug was: .where('parent_note_id', session.id)  → finds a CHILD (newer)
  // Fix:     .where('id', session.parentNoteId)     → finds the PARENT (older)z
  // if (session.parentNoteId) {
  //   const parent = await Session.query().where('id', session.parentNoteId).first(
  //   if (parent?.session?.trim()) {
  //     return parent.session
  //   }
  // }

  // ── Step 2: fallback — most recent session before this one ────────────────
  if (!session.patient && session.patientId) {
    await session.load('patient')
  }

  const patientId = session.patientId
  const clientId = session.patient?.clientId?.trim()

  if (!patientId && !clientId) return

  let resolvedPatientId = patientId

  if (!resolvedPatientId && clientId) {
    const patient = await Patient.findBy('client_id', clientId)
    resolvedPatientId = patient?.id ?? null
  }

  if (!resolvedPatientId) return undefined

  let query = Session.query()
    .where('patient_id', resolvedPatientId)
    .whereNot('id', session.id)
    .orderBy('session_time', 'desc')
  // .orderBy('id', 'desc')

  if (session.sessionTime?.isValid) {
    query = query.where('session_time', '<', session.sessionTime.toSQL()!)
  }

  const previous = await query.first()
  return previous?.session?.trim() || undefined
}
