import env from '#start/env'

export const bigQueryConfig = {
  projectId: env.get('BIGQUERY_PROJECT_ID', 'management-tools-mmhc'),
  clientEmail: env.get('BIGQUERY_CLIENT_EMAIL', ''),
  privateKey: env.get('BIGQUERY_PRIVATE_KEY'),
  notesTable: env.get(
    'BIGQUERY_NOTES_TABLE',
    '`management-tools-mmhc.Appointments_list_anonymized.notes`'
  ),
  appointmentTable: env.get(
    'BIGQUERY_APPOINTMENT_TABLE',
    '`management-tools-mmhc.Appointments_list_anonymized.appointment`'
  ),
}
