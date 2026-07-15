import { BaseSeeder } from '@adonisjs/lucid/seeders'
import IssueDescription from '#models/issue_description'
import logger from '@adonisjs/core/services/logger'

export default class extends BaseSeeder {
  async run() {
    try {
      const issueDescriptionsData = [
        { id: 1, key: 'no_clinical_interpretation', description: 'No clinical interpretation' },
        {
          id: 2,
          key: 'no_modality_intervention_explanation',
          description: 'No modality or intervention explanation',
        },
        {
          id: 3,
          key: 'vague_non_specific_language',
          description: 'Vague or non-specific language',
        },
        {
          id: 4,
          key: 'templated_boilerplate_language',
          description: 'Templated or boilerplate language',
        },
        {
          id: 5,
          key: 'repetitive_content_within_note',
          description: 'Repetitive content within the note',
        },
        {
          id: 6,
          key: 'not_specific_to_date_of_service',
          description: 'Not specific to date of service',
        },
        {
          id: 7,
          key: 'progress_marked_not_supported',
          description: 'Progress marked but not supported by note content',
        },
        {
          id: 8,
          key: 'transcription_style_documentation',
          description: 'Transcription-style documentation',
        },
        { id: 9, key: 'missing_required_field', description: 'Missing required field' },
        {
          id: 10,
          key: 'identical_duplicate_content_previous_note',
          description: 'Identical or duplicate content from previous note',
        },
        {
          id: 11,
          key: 'one_field_copied_previous_note',
          description: 'One field copied from previous note',
        },
        {
          id: 12,
          key: 'repetitive_field_multiple_notes',
          description: 'Repetitive field across multiple notes',
        },
        {
          id: 13,
          key: 'plan_generic_continuity_only',
          description: 'Plan is generic or continuity-only',
        },
      ]

      await IssueDescription.updateOrCreateMany('id', issueDescriptionsData)
    } catch (error) {
      logger.error(`Error in seeding issue descriptions: ${error}`)
      throw error
    }
  }
}
