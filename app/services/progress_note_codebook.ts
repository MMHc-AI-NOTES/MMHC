// The finalized progress note codebook, provided by the client on 7 August
// 2026. This is the authoritative list of what a reviewer can attach to each
// section and what each finding costs. The scorer tags its findings with these
// description ids, so the ids here must match that side verbatim.
//
// Seeded by 10_progress_note_codebook_seeder. To change an entry, change it
// here and redeploy; the seeder syncs the database to this list.
//
// Note the rec_6 to rec_8 ids under Reaction to Intervention: the codebook
// switches prefix from rea to rec partway through that section. Seeded exactly
// as provided so the ids agree with the scorer, flagged with the client in
// case it is a typo on their side.

export type CodebookSeverity = 'minor' | 'moderate' | 'critical'

export interface CodebookEntry {
  section: string
  descriptionId: string
  description: string
  severity: CodebookSeverity
}

export const PROGRESS_NOTE_CODEBOOK: CodebookEntry[] = [
  // Overall
  {
    section: 'Overall',
    descriptionId: 'ove_1',
    severity: 'minor',
    description: 'Vague or non-specific language',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_2',
    severity: 'minor',
    description: 'Templated or boilerplate language',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_3',
    severity: 'critical',
    description: 'Transcription-style documentation',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_4',
    severity: 'critical',
    description: 'Missing required field (including N/A or the likes)',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_5',
    severity: 'moderate',
    description:
      'Formatting and professional presentation disorganized or list-style documentation that reads as draft notes rather than a finalized clinical narrative',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_6',
    severity: 'minor',
    description:
      'Section content written as raw session notes rather than a summarized clinical record (not synthesized)',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_7',
    severity: 'minor',
    description: 'Casual or disjointed tone',
  },
  {
    section: 'Overall',
    descriptionId: 'ove_8',
    severity: 'critical',
    description: 'Note does not align with Diagnosis',
  },

  // Session Duration
  {
    section: 'Session Duration',
    descriptionId: 'ses_1',
    severity: 'critical',
    description: 'Duration mismatch with CPT code',
  },

  // Mental Status
  {
    section: 'Mental Status',
    descriptionId: 'men_1',
    severity: 'moderate',
    description: 'Mental status filled but does not describe observable behavior',
  },

  // Suicidality
  {
    section: 'Suicidality',
    descriptionId: 'sui_1',
    severity: 'critical',
    description: 'SI/HI marked as "Present" but no safety plan included',
  },
  {
    section: 'Suicidality',
    descriptionId: 'sui_2',
    severity: 'moderate',
    description: 'Inconsistencies between two or more fields',
  },

  // Homicidality
  {
    section: 'Homicidality',
    descriptionId: 'hom_1',
    severity: 'critical',
    description: 'SI/HI marked as "Present" but no safety plan included',
  },

  // Subjective
  {
    section: 'Subjective',
    descriptionId: 'sub_1',
    severity: 'moderate',
    description: 'Not specific to date of service',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_2',
    severity: 'minor',
    description: 'Vague or non-specific language',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_3',
    severity: 'minor',
    description: 'Slightly too definitive wording without legal risk',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_4',
    severity: 'minor',
    description: 'Templated or boilerplate language',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_5',
    severity: 'minor',
    description: 'Repetitive content excluding time, risk flags, or initials',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_6',
    severity: 'moderate',
    description: 'Inconsistencies between two or more fields',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_7',
    severity: 'moderate',
    description:
      'Subjective section describes activities/events rather than client internal experience',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_8',
    severity: 'critical',
    description: 'Field copy/paste from previous note (critical)',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_9',
    severity: 'critical',
    description: 'SI/HI marked as "Present" but no safety plan included',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_10',
    severity: 'critical',
    description: 'Overly definitive language without attribution',
  },
  {
    section: 'Subjective',
    descriptionId: 'sub_11',
    severity: 'critical',
    description: 'Irrelevant or excessively long content copied from a previous note',
  },

  // Objective
  {
    section: 'Objective',
    descriptionId: 'obj_1',
    severity: 'moderate',
    description: 'Not specific to date of service',
  },
  {
    section: 'Objective',
    descriptionId: 'obj_2',
    severity: 'minor',
    description: 'Repetitive content excluding time, risk flags, or initials',
  },
  {
    section: 'Objective',
    descriptionId: 'obj_3',
    severity: 'moderate',
    description: 'Field copy/paste from previous note (moderate)',
  },
  {
    section: 'Objective',
    descriptionId: 'obj_4',
    severity: 'minor',
    description: 'Templated or boilerplate language',
  },
  {
    section: 'Objective',
    descriptionId: 'obj_5',
    severity: 'minor',
    description: 'Vague or non-specific language',
  },
  {
    section: 'Objective',
    descriptionId: 'obj_6',
    severity: 'critical',
    description: 'Irrelevant or excessively long content copied from a previous note',
  },

  // Assessment & Therapeutic Intervention
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_1',
    severity: 'critical',
    description: 'Note lacks medical necessity',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_2',
    severity: 'moderate',
    description: 'Plan is generic and Lack plan',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_3',
    severity: 'critical',
    description: 'SI/HI marked as "Present" but no safety plan included',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_4',
    severity: 'critical',
    description: 'Field copy/paste from previous note (critical)',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_5',
    severity: 'critical',
    description: 'Irrelevant or excessively long content copied from a previous note',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_6',
    severity: 'moderate',
    description: 'Inconsistencies between two or more fields',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_7',
    severity: 'moderate',
    description: 'Overly definitive language without attribution',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_8',
    severity: 'moderate',
    description: 'Not specific to date of service',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_9',
    severity: 'moderate',
    description: 'No modality or intervention explanation',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_10',
    severity: 'moderate',
    description: 'No clinical interpretation',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_11',
    severity: 'minor',
    description: 'Repetitive content excluding time, risk flags, or initials',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_12',
    severity: 'minor',
    description: 'Slightly too definitive wording without legal risk',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_13',
    severity: 'minor',
    description: 'Templated or boilerplate language',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_14',
    severity: 'minor',
    description: 'Vague or non-specific language',
  },
  {
    section: 'Assessment & Therapeutic Intervention',
    descriptionId: 'ass_15',
    severity: 'minor',
    description: 'Lack of Continuity between the previous and current note',
  },

  // Reaction to Intervention. The prefix switch to rec_ from entry 6 onward is
  // in the client's codebook as provided.
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rea_1',
    severity: 'moderate',
    description: 'Plan is generic and Lack plan',
  },
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rea_2',
    severity: 'minor',
    description: 'Vague or non-specific language',
  },
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rea_3',
    severity: 'critical',
    description: 'Field copy/paste from previous note (critical)',
  },
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rea_4',
    severity: 'critical',
    description: 'SI/HI marked as "Present" but no safety plan included',
  },
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rea_5',
    severity: 'critical',
    description: 'Irrelevant or excessively long content copied from a previous note',
  },
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rec_6',
    severity: 'moderate',
    description: 'Not specific to date of service',
  },
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rec_7',
    severity: 'minor',
    description: 'Repetitive content excluding time, risk flags, or initials',
  },
  {
    section: 'Reaction to Intervention',
    descriptionId: 'rec_8',
    severity: 'minor',
    description: 'Templated or boilerplate language',
  },

  // Plan and Collaboration
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_1',
    severity: 'minor',
    description: 'Templated or boilerplate language',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_2',
    severity: 'moderate',
    description: 'Plan is generic and Lack plan',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_3',
    severity: 'minor',
    description: 'Vague or non-specific language',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_4',
    severity: 'minor',
    description: 'Repetitive content excluding time, risk flags, or initials',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_5',
    severity: 'moderate',
    description: 'Inconsistencies between two or more fields',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_6',
    severity: 'moderate',
    description: 'Not specific to date of service',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_7',
    severity: 'critical',
    description: 'Field copy/paste from previous note (critical)',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_8',
    severity: 'critical',
    description: 'SI/HI marked as "Present" but no safety plan included',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_9',
    severity: 'critical',
    description: 'Irrelevant or excessively long content copied from a previous note',
  },
  {
    section: 'Plan and Collaboration',
    descriptionId: 'pla_10',
    severity: 'minor',
    description: 'Lack of Continuity between the previous and current note',
  },
]

/** The sections this codebook covers. Templates outside it are left alone. */
export const CODEBOOK_SECTIONS = [...new Set(PROGRESS_NOTE_CODEBOOK.map((e) => e.section))]

/** Throws when the list contradicts itself, run by the seeder before writing. */
export function assertCodebookIsConsistent(entries = PROGRESS_NOTE_CODEBOOK): void {
  const ids = entries.map((e) => e.descriptionId)
  if (new Set(ids).size !== ids.length) {
    const repeated = ids.filter((id, i) => ids.indexOf(id) !== i)
    throw new Error(`Codebook repeats description ids: ${[...new Set(repeated)].join(', ')}`)
  }

  for (const entry of entries) {
    if (!entry.description.trim()) throw new Error(`${entry.descriptionId} has no description`)
    if (!['minor', 'moderate', 'critical'].includes(entry.severity)) {
      throw new Error(`${entry.descriptionId} has unknown severity ${entry.severity}`)
    }
  }
}
