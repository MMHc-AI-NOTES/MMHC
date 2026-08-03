import { BaseSeeder } from '@adonisjs/lucid/seeders'
import IssuesRelatedTo from '#models/issues_related_to'
import logger from '@adonisjs/core/services/logger'
import { ANNOTATABLE_SECTIONS, assertSectionsAreUnique } from '#services/annotatable_sections'

export default class extends BaseSeeder {
  async run() {
    try {
      assertSectionsAreUnique()
      await IssuesRelatedTo.updateOrCreateMany('id', ANNOTATABLE_SECTIONS)
    } catch (error) {
      logger.error(`Error in seeding issues related to: ${error}`)
      throw error
    }
  }
}
