export const PromptKeyEnum = {
  mental_status: 'mental_status',
  suicidality: 'suicidality',
  homicidality: 'homicidality',
  subjective: 'subjective',
  objective: 'objective',
  assessment_therapeutic_intervention: 'assessment_therapeutic_intervention',
  reaction_to_intervention: 'reaction_to_intervention',
  plan_and_collaboration: 'plan_and_collaboration',
  therapist_reflection: 'therapist_reflection',
  progress: 'progress',
  aggregator: 'aggregator',
} as const

export type PromptKeyType = (typeof PromptKeyEnum)[keyof typeof PromptKeyEnum]
