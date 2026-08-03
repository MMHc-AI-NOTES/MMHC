import { BaseSeeder } from '@adonisjs/lucid/seeders'
import IssuesRelatedTo from '#models/issues_related_to'
import logger from '@adonisjs/core/services/logger'

export default class extends BaseSeeder {
  async run() {
    try {
      // Sections a finding can be attached to. The UI matches a note's field
      // against display_name and field_id, so both must stay unique across the
      // whole list. A repeated name would silently take over another section.
      //
      // Ids 1 to 13 are progress note sections and Overall. Do not renumber:
      // sme_issues_tamplate and existing SME issues point at them.
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

        // Shared by intake and termination. One row each, since a section is
        // the same thing whichever note type it appears on.
        { id: 14, field_id: 'ot2p-1', display_name: 'First Name:' },
        { id: 15, field_id: 'ot2p-3', display_name: 'Last Name:' },
        { id: 16, field_id: 'ot2p-4', display_name: 'Date of Birth:' },
        { id: 17, field_id: 'fiuw-1', display_name: 'Encounter Type & Method' },
        { id: 18, field_id: '9j7d-1', display_name: 'Full Name & Credentials (Signature)' },
        { id: 19, field_id: '9j7d-2', display_name: 'Date Completed' },
        {
          id: 20,
          field_id: 'a17g-1',
          display_name: 'Documented by Supervised Clinician (if applicable)',
        },

        // Intake. Mental Status is deliberately absent: it already exists as
        // id 2 and a second row with the same name would break progress notes.
        { id: 21, field_id: 'ot2p-5', display_name: 'Initiation date' },
        { id: 22, field_id: 'h08z-1', display_name: 'Presenting Problem & Symptoms' },
        {
          id: 23,
          field_id: 't6rq-1',
          display_name: 'Pertinent history as related to presenting problem, trauma, abuse, etc',
        },
        { id: 24, field_id: 'u6ll-1', display_name: 'Bio/Psychosocial Assessment' },
        { id: 25, field_id: 'a8yi-1', display_name: 'Family History' },
        { id: 26, field_id: 'kxgx-1', display_name: 'Risk Assessment' },
        { id: 27, field_id: 'nv9g-1', display_name: 'Strengths' },
        // zad8-1 is already used by id 5 on progress notes, so this one is
        // suffixed. Matching for intake happens on display_name anyway.
        { id: 28, field_id: 'zad8-1-intake', display_name: 'Tenative Goals and Plans' },
        { id: 29, field_id: 'qaa1-1', display_name: 'Involvement' },
        { id: 30, field_id: 'g6eo-1', display_name: 'Cultural Variables?' },
        { id: 31, field_id: 'c5zm-1', display_name: 'If yes, please explain explain' },
        {
          id: 32,
          field_id: 'jfnz-1',
          display_name: 'Is Client Appropriate For Agency Services?',
        },
        { id: 33, field_id: '2xvm-1', display_name: 'If no, please explain' },

        // Termination
        { id: 34, field_id: 'uap4-5', display_name: 'Initiation Date:' },
        { id: 35, field_id: 'uap4-6', display_name: 'Review on' },
        { id: 36, field_id: 'uap4-7', display_name: 'days on' },
        { id: 37, field_id: 'fvuz-1', display_name: 'Treatment Goals & Objectives:' },
        { id: 38, field_id: 'pqkf-1', display_name: 'Progress Overview:' },
        { id: 39, field_id: 'vqnh-1', display_name: "Client's Reflections:" },
        { id: 40, field_id: 't24x-1', display_name: 'Client Satisfaction Level:' },
        { id: 41, field_id: 'k5h4-1', display_name: 'Engagement Level:' },
        { id: 42, field_id: '101p-1', display_name: 'Progress and Growth Areas:' },
        {
          id: 43,
          field_id: 'qnhp-1',
          display_name: 'Recommendations for Sustaining Progress:',
        },
        {
          id: 44,
          field_id: 'j9ro-1',
          display_name: 'Next Steps and Referrals (if applicable)',
        },
      ]

      const names = issuesRelatedToData.map((row) => row.display_name)
      const fieldIds = issuesRelatedToData.map((row) => row.field_id)
      if (new Set(names).size !== names.length || new Set(fieldIds).size !== fieldIds.length) {
        throw new Error('issues_related_to has a duplicate display_name or field_id')
      }

      await IssuesRelatedTo.updateOrCreateMany('id', issuesRelatedToData)
    } catch (error) {
      logger.error(`Error in seeding issues related to: ${error}`)
      throw error
    }
  }
}
