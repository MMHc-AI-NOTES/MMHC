import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'

export const createSmeIssueTemplateValidator = vine.compile(
  vine.object({
    error_type_id: vine.number().withoutDecimals(),
    issues_related_to_id: vine.number().withoutDecimals(),
    issue_description_id: vine.number().withoutDecimals(),
    description_id: vine.string().trim().maxLength(50).unique({
      table: SmeIssuesTamplate.table,
      column: 'description_id',
    }),
  })
)

export const updateSmeIssueTemplateValidator = vine.compile(
  vine.object({
    error_type_id: vine.number().withoutDecimals().optional(),
    issues_related_to_id: vine.number().withoutDecimals().optional(),
    issue_description_id: vine.number().withoutDecimals().optional().nullable(),
    description_id: vine
      .string()
      .trim()
      .maxLength(50)
      .unique(async (db, value, field) => {
        const templateId = field.meta.templateId
        const query = db.from(SmeIssuesTamplate.table).where('description_id', value)
        const template = templateId
          ? await query.whereNot('id', templateId).first()
          : await query.first()

        return !template
      })
      .optional()
      .nullable(),
  })
)

export type createSmeIssueTemplateValidatorInterface = Infer<typeof createSmeIssueTemplateValidator>
export type updateSmeIssueTemplateValidatorInterface = Infer<typeof updateSmeIssueTemplateValidator>
