import { BaseSeeder } from '@adonisjs/lucid/seeders'
import logger from '@adonisjs/core/services/logger'
import { seedMissingSectionTemplates } from '#services/section_template_service'

/**
 * A section with no templates gives the reviewer an empty plus button, so a
 * section added by 7_issues_related_to_seeder is not usable until this runs.
 * Both run from docker-entrypoint.sh, which is the only way to reach the
 * production database now that it runs on Fargate.
 *
 * Only fills sections that have none, so it is safe on every deploy.
 */
export default class extends BaseSeeder {
  async run() {
    try {
      const result = await seedMissingSectionTemplates({ apply: true })

      logger.info(
        `SME templates: ${result.sectionsSeeded} section(s) seeded, ` +
          `${result.templatesCreated} template(s), ${result.alreadyConfigured} already configured`
      )
    } catch (error) {
      logger.error(`Error in seeding SME issue templates: ${error}`)
      throw error
    }
  }
}
