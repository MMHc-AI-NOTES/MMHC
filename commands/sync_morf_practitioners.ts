import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Morf from '#models/morf'
import User from '#models/user'
import { UserTypeEnum } from '#enums/user_type_enum'

export default class SyncMorfPractitioners extends BaseCommand {
  static commandName = 'morf:sync-practitioners'

  static description =
    'Read morf_data, extract PractitionerId/name/email, create user (practitioner) if not exists by pq_id'

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

        const practitionerId =
          data.PractitionerId ?? data.practitioner_id ?? data.practitionerId ?? null

        if (
          practitionerId === null ||
          practitionerId === undefined ||
          String(practitionerId).trim() === ''
        ) {
          this.logger.warning(`Row id=${row.id}: no PractitionerId in data, skipping`)
          skipped++
          continue
        }

        const practitionerIdStr = String(practitionerId).trim()

        const existing = await User.query().where('pq_id', practitionerIdStr).first()

        if (existing) {
          skipped++
          continue
        }

        const fullName =
          data.PractitionerName ??
          data.practitioner_name ??
          data.practitionerName ??
          data.Name ??
          data.full_name ??
          null
        const email =
          data.PractitionerEmail ??
          data.practitioner_email ??
          data.practitionerEmail ??
          data.Email ??
          data.email ??
          null

        if (!email || String(email).trim() === '') {
          this.logger.warning(
            `Row id=${row.id}: no practitioner email in data, cannot create user, skipping`
          )
          skipped++
          continue
        }

        const emailStr = String(email).trim()

        const existingByEmail = await User.query().where('email', emailStr).first()
        if (existingByEmail) {
          await existingByEmail.merge({ pqId: practitionerIdStr }).save()
          this.logger.info(
            `Updated existing user id=${existingByEmail.id} with pq_id=${practitionerIdStr} (from morf_data id=${row.id})`
          )
          created++
          continue
        }

        await User.create({
          email: emailStr,
          fullName: fullName ? String(fullName).trim() : null,
          pqId: practitionerIdStr,
          type: UserTypeEnum.practitioner,
          isActive: true,
          password: null,
        })
        created++
        this.logger.info(
          `Created practitioner user pq_id=${practitionerIdStr}, email=${emailStr} (from morf_data id=${row.id})`
        )
      } catch (err: any) {
        errors++
        this.logger.error(`Row id=${row.id}: ${err.message}`)
      }
    }

    this.logger.success(
      `Done. Created/Updated: ${created}, Skipped (existing or no PractitionerId/email): ${skipped}, Errors: ${errors}`
    )

    process.exit(0)
  }
}
