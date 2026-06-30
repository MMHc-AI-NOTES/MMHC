import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const submitFeedbackValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    scorer_version: vine.string().trim().optional(),
    reviewer: vine.string().trim().minLength(1),
    reviewed_at: vine.string().trim().minLength(1),
    verdicts: vine
      .array(
        vine.object({
          section: vine.string().trim(),
          description_id: vine.string().trim().optional(),
          description: vine.string().trim().optional(),
          code: vine.string().trim().optional(),
          side: vine.string().trim().minLength(1),
          verdict: vine.string().trim().minLength(1),
          comment: vine.string().trim().optional(),
          by: vine.string().trim().minLength(1),
        })
      )
      .minLength(1),
  })
)

export type SubmitFeedbackPayload = Infer<typeof submitFeedbackValidator>

export const feedbackVerdictIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)
