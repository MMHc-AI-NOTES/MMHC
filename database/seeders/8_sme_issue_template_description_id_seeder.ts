import { BaseSeeder } from '@adonisjs/lucid/seeders'
import IssuesRelatedTo from '#models/issues_related_to'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import {
  getNextDescriptionId,
  resequenceDescriptionIds,
} from '#helpers/sme_issue_template_description_id_helper'

export default class extends BaseSeeder {
  async run() {
    try {
      const templates = await SmeIssuesTamplate.query().orderBy('id', 'asc')

      for (const template of templates) {
        if (template.descriptionId && String(template.descriptionId).trim().length > 0) {
          continue
        }

        const issuesRelatedTo = await IssuesRelatedTo.find(template.issuesRelatedToId)
        if (!issuesRelatedTo) {
          continue
        }

        template.descriptionId = await getNextDescriptionId(issuesRelatedTo.displayName)
        await template.save()
      }

      const sections = await IssuesRelatedTo.query().select('id')
      for (const section of sections) {
        await resequenceDescriptionIds(section.id)
      }
    } catch (error) {
      console.log(`Error in seeding SME issue template description IDs: ${error}`)
      throw error
    }
  }
}
