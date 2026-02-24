import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Morf from '#models/morf'
import Patient from '#models/patient'

export default class SyncMorfPatients extends BaseCommand {
  static commandName = 'morf:sync-patients'

  static description =
    'Read morf_data, extract ClientId from each data row, create patient if client_id does not exist'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const rows = await Morf.query().orderBy('id', 'asc')

    this.logger.info(`Found ${rows.length} rows in morf_data`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const row of rows) {
      try {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        if (!data || typeof data !== 'object') {
          this.logger.warning(`Row id=${row.id}: data is empty or not an object, skipping`)
          skipped++
          continue
        }

        const clientId = data.ClientId ?? data.client_id ?? data.clientId ?? null

        if (clientId === null || clientId === undefined || String(clientId).trim() === '') {
          this.logger.warning(`Row id=${row.id}: no ClientId in data, skipping`)
          skipped++
          continue
        }

        const clientIdStr = String(clientId).trim()

        const existing = await Patient.query().where('client_id', clientIdStr).first()

        if (existing) {
          skipped++
          continue
        }

        await Patient.create({
          clientId: clientIdStr,
        })
        created++
        this.logger.info(
          `Created patient with client_id=${clientIdStr} (from morf_data id=${row.id})`
        )
      } catch (err: any) {
        errors++
        this.logger.error(`Row id=${row.id}: ${err.message}`)
      }
    }

    this.logger.success(
      `Done. Created: ${created}, Skipped (existing or no ClientId): ${skipped}, Errors: ${errors}`
    )

    process.exit(0)
  }
}
