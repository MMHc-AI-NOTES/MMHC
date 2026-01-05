// Review Cycle Enum
export const ReviewCycleEnum = {
  cycle_1_of_3: 1,
  cycle_2_of_3_therapist_revision: 2,
  cycle_3_of_3_final_review: 3,
  auto_blacklisted_max_cycles_exceeded: 4,
}

// Review Cycle Display Names
export const ReviewCycleDisplayNames: Record<number, string> = {
  1: 'Cycle 1 of 3',
  2: 'Cycle 2 of 3 – Therapist Revision',
  3: 'Cycle 3 of 3 – Final Review',
  4: 'Auto-Blacklisted – Max Cycles Exceeded',
}
