import { BaseSeeder } from '@adonisjs/lucid/seeders'
import IssuesRelatedTo from '#models/issues_related_to'

export default class extends BaseSeeder {
  async run() {
    try {
      const issuesRelatedToData = [
        { id: 1, field_id: 'p9m9-1', display_name: 'Session Duration' },
        { id: 2, field_id: '1hye-1', display_name: 'Mental Status' },
        { id: 3, field_id: '6tx9-1', display_name: 'Subjective' },
        { id: 4, field_id: 'rb2f-1', display_name: 'Objective' },
        {
          id: 5,
          field_id: 'zad8-1',
          display_name: 'Assessment & Therapeutic Intervention',
        },
        { id: 6, field_id: 'ugq6-1', display_name: 'Reaction to Intervention' },
        { id: 7, field_id: 'hnfi-1', display_name: 'Plan and Collaboration' },
        {
          id: 8,
          field_id: '9z5t-1',
          display_name: 'Therapist Reflection and Insight',
        },
        { id: 9, field_id: 'gm4p-1', display_name: 'Progress' },
        { id: 10, field_id: 'kxgx-7', display_name: 'Suicidality' },
        { id: 11, field_id: 'kxgx-8', display_name: 'Homicidality' },
        { id: 12, field_id: '4lbp-1', display_name: 'Therapist Initials' },
        { id: 13, field_id: 'overall', display_name: 'Overall' },
      ]

      await IssuesRelatedTo.updateOrCreateMany('id', issuesRelatedToData)
    } catch (error) {
      console.log(`Error in seeding issues related to: ${error}`)
      throw error
    }
  }
}
