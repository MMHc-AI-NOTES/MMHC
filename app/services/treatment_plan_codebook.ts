// The treatment plan codebook, provided by the client on 15 August 2026. One
// codebook for the three treatment plan templates: Initial Consultation:
// Assessment/Treatment Plan, Treatment Plan 90 Day Renewal, and Treatment
// Plan / Progress Note Combined. The progress note sections of the Combined
// template are scored by the progress note codebook and add nothing here.
//
// The source document defines names and severities but no code ids. The ids
// below were assigned by the platform and published to the scorer side, which
// must send them verbatim.
//
// Goal level codes attach to the goals field and fire once per note whatever
// the number of goals. The Irrelevant code goa_1 also covers the optional
// Notes box inside a goal block.

import type { CodebookEntry } from '#services/progress_note_codebook'

export const TREATMENT_PLAN_CODEBOOK: CodebookEntry[] = [
  {
    section: 'Referral for Additional Services?',
    descriptionId: 'ref_1',
    severity: 'critical',
    description: 'Irrelevant',
  },
  {
    section: 'Session Frequency:',
    descriptionId: 'fre_1',
    severity: 'critical',
    description: 'Irrelevant',
  },
  {
    section: 'Primary Clinical Approach',
    descriptionId: 'pri_1',
    severity: 'critical',
    description: 'Irrelevant',
  },
  {
    section: 'Secondary Clinical Approach',
    descriptionId: 'sec_1',
    severity: 'critical',
    description: 'Irrelevant',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_1',
    severity: 'critical',
    description: 'Irrelevant',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_2',
    severity: 'critical',
    description: 'Fewer than two treatment goals active',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_3',
    severity: 'critical',
    description: 'Error in Goals carry over',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_4',
    severity: 'critical',
    description: 'Error in Goal/Objective status',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_5',
    severity: 'critical',
    description: 'Target completion date invalid',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_6',
    severity: 'moderate',
    description: 'Long-term goal does not meet the writing standard',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_7',
    severity: 'moderate',
    description: 'Short-term objective has no identifiable clinical target',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_8',
    severity: 'critical',
    description: 'Clinical intervention not aligned with the goal',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_9',
    severity: 'critical',
    description: 'Clinical intervention missing evidence-based therapeutic modality',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_10',
    severity: 'moderate',
    description: 'Clinical intervention therapeutic purpose not explained',
  },
  {
    section: 'Tenative Goals & Plans:',
    descriptionId: 'goa_11',
    severity: 'minor',
    description: 'Clinical intervention lacks ongoing treatment applicability',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_9',
    severity: 'moderate',
    description: 'Inconsistencies between two or more fields',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_10',
    severity: 'critical',
    description: 'Goals do not align with the diagnosis',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_11',
    severity: 'moderate',
    description: 'Secondary Modality repeats an approach already selected as Primary Modality',
  },
]

// Sections the treatment plan codebook owns. Templates in these sections that
// are not in the codebook are removed by the sync. Overall is not listed: it
// is shared with the progress note codebook and owned there.
export const TREATMENT_PLAN_CODEBOOK_SECTIONS = [
  'Referral for Additional Services?',
  'If yes, specify:',
  'Session Frequency:',
  'Expected Duration:',
  'Treatment Modality',
  'Primary Clinical Approach',
  'Secondary Clinical Approach',
  'Tenative Goals & Plans:',
  'Expected Length of Treatment:',
  'Appointments Frequency:',
  'Progress Since Last Plan',
]

/** Goal fields belong to the treatment plan codebook too: cleared, no codes of their own. */
export const isGoalSectionName = (displayName: string): boolean => displayName.startsWith('Goal ')

/** Throws when the codebook contradicts itself. Called by the sync before it writes. */
export const assertTreatmentPlanCodebookIsConsistent = (): void => {
  const ids = TREATMENT_PLAN_CODEBOOK.map((e) => e.descriptionId)
  if (new Set(ids).size !== ids.length) {
    throw new Error('Treatment plan codebook repeats a description id')
  }

  const allowedSections = new Set([...TREATMENT_PLAN_CODEBOOK_SECTIONS, 'Overall'])
  for (const entry of TREATMENT_PLAN_CODEBOOK) {
    if (!allowedSections.has(entry.section)) {
      throw new Error(`Treatment plan codebook uses an unlisted section: ${entry.section}`)
    }
  }
}
