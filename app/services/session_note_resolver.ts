import Session from '#models/session'
import Patient from '#models/patient'

export async function resolvePreviousSessionContent(session: Session): Promise<string | undefined> {
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
