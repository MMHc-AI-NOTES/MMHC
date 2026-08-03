import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import ErrorType from '#models/error_type'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import { getNextDescriptionId } from '#helpers/sme_issue_template_description_id_helper'

/**
 * Creates SME issue templates for sections that have none.
 *
 * A section on its own is not enough for the plus button: it offers templates,
 * and a template is a section joined to an issue description and a severity.
 * Progress note sections were set up by hand through Settings, so every other
 * note type had none and the button reported nothing available.
 *
 * Only touches sections with zero templates, so anything already configured is
 * left exactly as it is. Reports by default, writes with --apply.
 */
export default class SeedSectionTemplates extends BaseCommand {
  static commandName = 'sme:seed-section-templates'
  static description = 'Create starter SME issue templates for sections that have none'

  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Write the templates. Without it the command only reports.' })
  declare apply: boolean

  @flags.string({ description: 'Only sections whose name contains this text' })
  declare section?: string

  /**
   * Documentation quality issues that apply to any written section. The
   * section specific ones, such as progress not being supported, are left to
   * the SME team to add where they belong.
   */
  private readonly GENERAL_DESCRIPTION_KEYS = [
    'vague_non_specific_language',
    'templated_boilerplate_language',
    'not_specific_to_date_of_service',
    'no_clinical_interpretation',
    'missing_required_field',
    'identical_duplicate_content_previous_note',
  ]

  async run() {
    const errorType = await ErrorType.findBy('name', 'moderate')
    if (!errorType) {
      this.logger.error('No "moderate" error type found. Run the error type seeder first.')
      return
    }

    const descriptions = await IssueDescription.query().whereIn(
      'key',
      this.GENERAL_DESCRIPTION_KEYS
    )

    if (!descriptions.length) {
      this.logger.error('No matching issue descriptions found. Run the description seeder first.')
      return
    }

    this.logger.info(`Using ${descriptions.length} description(s) at severity "${errorType.name}"`)

    const sectionQuery = IssuesRelatedTo.query()
    if (this.section) sectionQuery.where('display_name', 'like', `%${this.section}%`)
    const sections = await sectionQuery.orderBy('id', 'asc')

    let sectionsSeeded = 0
    let templatesCreated = 0
    let skipped = 0

    for (const section of sections) {
      const existing = await SmeIssuesTamplate.query()
        .where('issues_related_to_id', section.id)
        .whereNull('deleted_at')
        .first()

      // Already configured. Never overwrite what the SME team has set up.
      if (existing) {
        skipped++
        continue
      }

      sectionsSeeded++
      this.logger.info(
        `${section.displayName}: ${descriptions.length} template(s)${this.apply ? '' : ' (dry run)'}`
      )

      if (!this.apply) {
        templatesCreated += descriptions.length
        continue
      }

      for (const description of descriptions) {
        const descriptionId = await getNextDescriptionId(section.displayName)
        await SmeIssuesTamplate.create({
          errorTypeId: errorType.id,
          issuesRelatedToId: section.id,
          issueDescriptionId: description.id,
          descriptionId,
        })
        templatesCreated++
      }
    }

    this.logger.info(
      `Done. ${sectionsSeeded} section(s) seeded, ${templatesCreated} template(s), ${skipped} already configured`
    )
    if (!this.apply && templatesCreated) this.logger.info('Re run with --apply to write these')
  }
}
