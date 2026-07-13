import { BigQuery } from '@google-cloud/bigquery'
import { bigQueryConfig } from '#config/bigquery'

let bigQueryClient: BigQuery | null = null

function getBigQueryClient(): BigQuery {
  if (bigQueryClient) {
    return bigQueryClient
  }

  if (!bigQueryConfig.clientEmail || !bigQueryConfig.privateKey) {
    throw new Error(
      'BigQuery credentials are not configured. Set BIGQUERY_CLIENT_EMAIL and BIGQUERY_PRIVATE_KEY.'
    )
  }

  bigQueryClient = new BigQuery({
    projectId: bigQueryConfig.projectId,
    credentials: {
      client_email: bigQueryConfig.clientEmail,
      private_key: bigQueryConfig.privateKey,
    },
  })

  return bigQueryClient
}

function buildAppointmentTypeIdQuery(noteId: string) {
  return {
    query: `
WITH latest_note AS (
  SELECT
    n.AppointmentId
  FROM ${bigQueryConfig.notesTable} n
  WHERE n.NoteId = @noteId
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY n.NoteId
    ORDER BY
      n.LastModified DESC,
      n.EventTimestamp DESC,
      n.Date DESC
  ) = 1
),
latest_appointment AS (
  SELECT
    a.Id AS AppointmentId,
    a.AppointmentTypeId
  FROM ${bigQueryConfig.appointmentTable} a
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY a.Id
    ORDER BY
      a.LastModified DESC,
      a.EventTimestamp DESC,
      a.Date DESC
  ) = 1
)
SELECT (
  SELECT a.AppointmentTypeId
  FROM latest_note n
  LEFT JOIN latest_appointment a
    ON a.AppointmentId = n.AppointmentId
  LIMIT 1
) AS AppointmentTypeId
`.trim(),
    params: { noteId },
    useLegacySql: false,
  }
}

/**
 * Resolve AppointmentTypeId for a note from Google BigQuery.
 */
export async function fetchAppointmentTypeIdFromBigQuery(noteId: string): Promise<string | null> {
  const bigquery = getBigQueryClient()
  const [job] = await bigquery.createQueryJob(buildAppointmentTypeIdQuery(noteId))
  const [rows] = await job.getQueryResults()

  const appointmentTypeId = rows[0]?.AppointmentTypeId
  if (appointmentTypeId === undefined || appointmentTypeId === null) {
    return null
  }

  return String(appointmentTypeId)
}
