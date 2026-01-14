import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const webhookSessionValidator = vine.compile(
  vine.object({
    PractitionerName: vine.string().optional(),
    ClientId: vine.string().optional(),
    Status: vine.string().optional(),
    EventTime: vine
      .object({
        seconds: vine.string().optional(),
        nanoseconds: vine.string().optional(),
      })
      .optional(),
    PractitionerId: vine.string().optional(),
    NoteId: vine.string().trim().minLength(1),
    Questions: vine.array(
      vine.object({
        id: vine.string(),
        text: vine.string(),
        answer: vine.string().optional(),
        question_type: vine.string().optional(),
      })
    ),
    AppointmentId: vine.string().optional(),
    NoteName: vine.string().optional(),
    Date: vine.string().optional(),
    EventTimestamp: vine.string().optional(),
    LastModified: vine.string().optional(),
    Diagnoses: vine.array(vine.any()).optional(),
    Diagnosis: vine.array(vine.any()).optional(),
  })
)

export type webhookSessionValidatorInterface = Infer<typeof webhookSessionValidator>
