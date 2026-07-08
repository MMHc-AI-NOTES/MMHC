import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { FeedbackVerdictEnum } from '#enums/feedback_verdict_enum'
import Session from '#models/session'
import FeedbackVerdict from '#models/feedback_verdict'

export const submitFeedbackValidator = vine.compile(
  vine.object({
    session_id: vine
      .string()
      .trim()
      .minLength(1)
      .exists({
        table: Session.table,
        column: 'id',
        filter: (query) => {
          query.whereNull('deleted_at')
        },
      }),
    description_id: vine.string().trim().minLength(1),
    verdict: vine
      .number()
      .withoutDecimals()
      .in([FeedbackVerdictEnum.UP.id, FeedbackVerdictEnum.DOWN.id]),
    comment: vine.string().trim().optional(),
  })
)

submitFeedbackValidator.messagesProvider = new SimpleMessagesProvider({
  'session_id.database.exists': 'Session not found for the provided session_id',
})

export type SubmitFeedbackPayload = Infer<typeof submitFeedbackValidator>

export const feedbackVerdictIdValidator = vine.compile(
  vine.object({
    id: vine
      .number()
      .withoutDecimals()
      .exists({
        table: FeedbackVerdict.table,
        column: 'id',
      }),
  })
)

feedbackVerdictIdValidator.messagesProvider = new SimpleMessagesProvider({
  'id.database.exists': 'Feedback verdict not found for the provided id',
})

export const feedbackSessionIdParamsValidator = vine.compile(
  vine.object({
    session_id: vine.string().trim().minLength(1),
  })
)
