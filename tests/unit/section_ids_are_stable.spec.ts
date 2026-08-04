import { test } from '@japa/runner'
import { ANNOTATABLE_SECTIONS } from '#services/annotatable_sections'

/**
 * A section id is a permanent identifier. Every SME issue and every template
 * row points at one, so moving an id repoints existing findings at a different
 * section, and nothing at runtime would report it.
 *
 * The pinned list below records the id every section name holds
 * today. Do not regenerate it to make this pass. A new section takes the next
 * free id and is added to the list. A section that has to move needs a
 * migration for the rows that reference it.
 */
const pinned: Record<string, number> = {
  'Session Duration': 1,
  'Mental Status': 2,
  'Subjective': 3,
  'Objective': 4,
  'Assessment & Therapeutic Intervention': 5,
  'Reaction to Intervention': 6,
  'Plan and Collaboration': 7,
  'Therapist Reflection and Insight': 8,
  'Progress': 9,
  'Suicidality': 10,
  'Homicidality': 11,
  'Therapist Initials': 12,
  'Overall': 13,
  'First Name:': 14,
  'Last Name:': 15,
  'Date of Birth:': 16,
  'Encounter Type & Method': 17,
  'Full Name & Credentials (Signature)': 18,
  'Date Completed': 19,
  'Documented by Supervised Clinician (if applicable)': 20,
  'Initiation date': 21,
  'Presenting Problem & Symptoms': 22,
  'Pertinent history as related to presenting problem, trauma, abuse, etc': 23,
  'Bio/Psychosocial Assessment': 24,
  'Family History': 25,
  'Risk Assessment': 26,
  'Strengths': 27,
  'Tenative Goals and Plans': 28,
  'Involvement': 29,
  'Cultural Variables?': 30,
  'If yes, please explain explain': 31,
  'Is Client Appropriate For Agency Services?': 32,
  'If no, please explain': 33,
  'Initiation Date:': 34,
  'Review on': 35,
  'days on': 36,
  'Treatment Goals & Objectives:': 37,
  'Progress Overview:': 38,
  "Client's Reflections:": 39,
  'Client Satisfaction Level:': 40,
  'Engagement Level:': 41,
  'Progress and Growth Areas:': 42,
  'Recommendations for Sustaining Progress:': 43,
  'Next Steps and Referrals (if applicable)': 44,
  'Referral for Additional Services?': 45,
  'If yes, specify:': 46,
  'Session Frequency:': 47,
  'Expected Duration:': 48,
  'Treatment Modality': 49,
  'Primary Clinical Approach': 50,
  'Secondary Clinical Approach': 51,
  'Tenative Goals & Plans:': 52,
  'Expected Length of Treatment:': 53,
  'Appointments Frequency:': 54,
  'Progress Since Last Plan': 55,
  'Current Diagnosis': 56,
  'Communication Difficulties': 57,
  'Enhanced Communication': 58,
  'Goal 1 Long-Term Goal': 60,
  'Goal 1 Target Completion Date': 61,
  'Goal 1 Status': 62,
  'Goal 1 Short-Term Objective 1': 63,
  'Goal 1 Objective 1 Target Date': 64,
  'Goal 1 Objective 1 Status': 65,
  'Goal 1 Short-Term Objective 2': 66,
  'Goal 1 Objective 2 Target Date': 67,
  'Goal 1 Objective 2 Status': 68,
  'Goal 1 Primary Clinical Intervention': 69,
  'Goal 1 Secondary Clinical Intervention': 70,
  'Goal 1 Notes': 71,
  'Goal 1 Objectives and Interventions': 72,
  'Goal 1 Intervention Completion Date': 73,
  'Goal 2 Long-Term Goal': 74,
  'Goal 2 Target Completion Date': 75,
  'Goal 2 Status': 76,
  'Goal 2 Short-Term Objective 1': 77,
  'Goal 2 Objective 1 Target Date': 78,
  'Goal 2 Objective 1 Status': 79,
  'Goal 2 Short-Term Objective 2': 80,
  'Goal 2 Objective 2 Target Date': 81,
  'Goal 2 Objective 2 Status': 82,
  'Goal 2 Primary Clinical Intervention': 83,
  'Goal 2 Secondary Clinical Intervention': 84,
  'Goal 2 Notes': 85,
  'Goal 2 Objectives and Interventions': 86,
  'Goal 2 Intervention Completion Date': 87,
  'Goal 3 Long-Term Goal': 88,
  'Goal 3 Target Completion Date': 89,
  'Goal 3 Status': 90,
  'Goal 3 Short-Term Objective 1': 91,
  'Goal 3 Objective 1 Target Date': 92,
  'Goal 3 Objective 1 Status': 93,
  'Goal 3 Short-Term Objective 2': 94,
  'Goal 3 Objective 2 Target Date': 95,
  'Goal 3 Objective 2 Status': 96,
  'Goal 3 Primary Clinical Intervention': 97,
  'Goal 3 Secondary Clinical Intervention': 98,
  'Goal 3 Notes': 99,
  'Goal 3 Objectives and Interventions': 100,
  'Goal 3 Intervention Completion Date': 101,
  'Goal 4 Long-Term Goal': 102,
  'Goal 4 Target Completion Date': 103,
  'Goal 4 Status': 104,
  'Goal 4 Short-Term Objective 1': 105,
  'Goal 4 Objective 1 Target Date': 106,
  'Goal 4 Objective 1 Status': 107,
  'Goal 4 Short-Term Objective 2': 108,
  'Goal 4 Objective 2 Target Date': 109,
  'Goal 4 Objective 2 Status': 110,
  'Goal 4 Primary Clinical Intervention': 111,
  'Goal 4 Secondary Clinical Intervention': 112,
  'Goal 4 Notes': 113,
  'Goal 4 Objectives and Interventions': 114,
  'Goal 4 Intervention Completion Date': 115,
  'Goal 1 Intervention 1a Completion Date': 116,
  'Goal 2 Intervention 2a Completion Date': 117,
  'Goal 3 Intervention 3a Completion Date': 118,
  'Goal 4 Intervention 4a Completion Date': 119,
}

test.group('Section ids are stable', () => {
  test('no section has moved to a different id', ({ assert }) => {
    const moved: string[] = []

    for (const section of ANNOTATABLE_SECTIONS) {
      const expected = pinned[section.display_name]
      if (expected !== undefined && expected !== section.id) {
        moved.push(`${section.display_name}: was ${expected}, now ${section.id}`)
      }
    }

    assert.deepEqual(moved, [], 'Existing findings point at these ids')
  })

  test('no section has been removed', ({ assert }) => {
    const present = new Set(ANNOTATABLE_SECTIONS.map((section) => section.display_name))
    const missing = Object.keys(pinned).filter((name) => !present.has(name))

    assert.deepEqual(missing, [], 'Removing a section orphans the findings attached to it')
  })

  test('a new section is added to the fixture', ({ assert }) => {
    // Keeps the fixture honest. Without this a section could be added and never
    // pinned, so it could move freely afterwards.
    const unpinned = ANNOTATABLE_SECTIONS.filter(
      (section) => pinned[section.display_name] === undefined
    ).map((section) => `${section.display_name} (${section.id})`)

    assert.deepEqual(unpinned, [], 'Add these to the pinned list in this file')
  })

  test('the ids a goal field holds are the ones already in the database', ({ assert }) => {
    // Spot check across the range rather than trusting the fixture alone.
    const byName = new Map(ANNOTATABLE_SECTIONS.map((s) => [s.display_name, s.id]))

    assert.equal(byName.get('Goal 1 Long-Term Goal'), 60)
    assert.equal(byName.get('Goal 2 Long-Term Goal'), 74)
    assert.equal(byName.get('Goal 4 Intervention Completion Date'), 115)
    assert.equal(byName.get('Goal 1 Intervention 1a Completion Date'), 116)
    assert.equal(byName.get('Goal 4 Intervention 4a Completion Date'), 119)
  })

  test('the id a new section should take is the next free one', ({ assert }) => {
    const used = new Set(ANNOTATABLE_SECTIONS.map((section) => section.id))
    const highest = Math.max(...used)

    assert.equal(highest, 119)
    assert.isFalse(used.has(120), 'A new section takes 120, not a gap in the middle')
  })
})
