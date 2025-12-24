import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const updateNoteValidator = vine.compile(
  vine.object({
    session: vine.string().trim().optional(),
    session_time: vine.date().optional(),
    practitioner_id: vine.number().withoutDecimals().optional(),
    patient_id: vine.number().withoutDecimals().optional(),
    type: vine.number().withoutDecimals().optional(),
    ai_score: vine.number().optional(),
    ai_status: vine.number().withoutDecimals().optional(),
    human_review: vine.number().withoutDecimals().optional(),
    manager: vine.number().withoutDecimals().optional(),
    workflow: vine.number().withoutDecimals().optional(),
    priority: vine.number().withoutDecimals().optional(),
  })
)

export type updateNoteValidatorInterface = Infer<typeof updateNoteValidator>
