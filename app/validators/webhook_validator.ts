import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const webhookSessionValidator = vine.compile(
  vine.object({
    PractitionerName: vine.string().optional(),
    PractitionerEmail: vine.string().email().optional(),
    ClientId: vine.number().optional(),
    Status: vine.string().optional(),
    EventTime: vine
      .object({
        seconds: vine.number().optional(),
        nanoseconds: vine.number().optional(),
      })
      .optional(),
    PractitionerId: vine.string().optional(),
    NoteId: vine.string().trim().minLength(1),
    Questions: vine.array(
      vine.object({
        id: vine.string(),
        text: vine.string().optional(),
        answer: vine.string().optional(),
        question_type: vine.string().optional(),
        office_use: vine.boolean().optional(),
      })
    ),
    AppointmentId: vine.string().optional(),
    NoteName: vine.string().optional(),
    Date: vine.string().optional(),
    EventTimestamp: vine
      .object({
        seconds: vine.number().optional(),
        nanoseconds: vine.number().optional(),
      })
      .optional(),
    LastModified: vine.string().optional(),
    Diagnoses: vine
      .array(
        vine.object({
          Code: vine.string().optional(),
          Date: vine.any().optional(),
          Description: vine.string().optional(),
          EndDate: vine.any().optional(),
          NoteId: vine.string().optional(),
        })
      )
      .optional(),
    Diagnosis: vine
      .array(
        vine.object({
          Code: vine.string().optional(),
          Date: vine.any().optional(),
          Description: vine.string().optional(),
          EndDate: vine.any().optional(),
          NoteId: vine.string().optional(),
        })
      )
      .optional(),
  })
)

export type webhookSessionValidatorInterface = Infer<typeof webhookSessionValidator>
