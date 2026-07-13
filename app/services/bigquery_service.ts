import { bigQueryConfig } from '#config/bigquery'
import { bigQueryService } from '#services/client_big_query_services'

export async function fetchAppointmentTypeIdFromBigQuery(noteId: string): Promise<string | null> {
  const bigquery = bigQueryService.client
  const queryString = {
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
  const [job] = await bigquery.createQueryJob(queryString)
  const [rows] = await job.getQueryResults()
  const appointmentTypeId = rows[0]?.AppointmentTypeId
  if (!appointmentTypeId) {
    return null
  }
  return String(appointmentTypeId)
}
