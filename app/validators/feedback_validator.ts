import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { FeedbackVerdictEnum } from '#enums/feedback_verdict_enum'

export const submitFeedbackValidator = vine.compile(
  vine.object({
    note_id: vine.string().trim().minLength(1),
    description_id: vine.string().trim().minLength(1),
    verdict: vine
      .number()
      .withoutDecimals()
      .in([FeedbackVerdictEnum.ACCEPT, FeedbackVerdictEnum.REFUTE]),
    comment: vine.string().trim().optional(),
  })
)

export type SubmitFeedbackPayload = Infer<typeof submitFeedbackValidator>

export const feedbackVerdictIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)
