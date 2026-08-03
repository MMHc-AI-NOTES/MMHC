import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { seedMissingSectionTemplates } from '#services/section_template_service'

/**
 * The same work 9_sme_issue_template_seeder does on deploy, exposed as a
 * command so it can be inspected before it writes.
 *
 * A section on its own is not enough for the plus button: it offers templates,
 * and a template is a section joined to an issue description and a severity.
 */
export default class SeedSectionTemplates extends BaseCommand {
  static commandName = 'sme:seed-section-templates'
  static description = 'Create starter SME issue templates for sections that have none'

  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Write the templates. Without it the command only reports.' })
  declare apply: boolean

  @flags.string({ description: 'Only sections whose name contains this text' })
  declare section?: string

  async run() {
    const result = await seedMissingSectionTemplates({
      apply: this.apply,
      sectionLike: this.section,
      onSection: (displayName, count) =>
        this.logger.info(`${displayName}: ${count} template(s)${this.apply ? '' : ' (dry run)'}`),
    })

    if (!result.severity) {
      this.logger.error(
        'No "moderate" error type or no issue descriptions found. Seed those first.'
      )
      return
    }

    this.logger.info(
      `Done. ${result.sectionsSeeded} section(s) seeded, ${result.templatesCreated} template(s), ` +
        `${result.alreadyConfigured} already configured`
    )
    if (!this.apply && result.templatesCreated) {
      this.logger.info('Re run with --apply to write these')
    }
  }
}
