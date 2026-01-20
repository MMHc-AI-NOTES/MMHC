import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { ErrorTypeEnum, IssuesRelatedToEnum, IssueDescriptionEnum } from '#enums/manual_issue_enum'

export const createSmeIssueValidator = vine.compile(
  vine.object({
    reviewer_id: vine.number().withoutDecimals(),
    error_type: vine
      .number()
      .withoutDecimals()
      .in([ErrorTypeEnum.minor, ErrorTypeEnum.moderate, ErrorTypeEnum.critical]),
    issues_related_to: vine
      .number()
      .withoutDecimals()
      .in([
        IssuesRelatedToEnum['p9m9-1'],
        IssuesRelatedToEnum['1hye-1'],
        IssuesRelatedToEnum['6tx9-1'],
        IssuesRelatedToEnum['rb2f-1'],
        IssuesRelatedToEnum['zad8-1'],
        IssuesRelatedToEnum['ugq6-1'],
        IssuesRelatedToEnum['hnfi-1'],
        IssuesRelatedToEnum['9z5t-1'],
        IssuesRelatedToEnum['gm4p-1'],
        IssuesRelatedToEnum['kxgx-7'],
        IssuesRelatedToEnum['kxgx-8'],
        IssuesRelatedToEnum['4lbp-1'],
        IssuesRelatedToEnum.general,
      ]),
    description: vine.number().transform((value) => {
      const validIds = [
        IssueDescriptionEnum.no_clinical_interpretation,
        IssueDescriptionEnum.no_modality_intervention_explanation,
        IssueDescriptionEnum.vague_non_specific_language,
        IssueDescriptionEnum.templated_boilerplate_language,
        IssueDescriptionEnum.repetitive_content_within_note,
        IssueDescriptionEnum.not_specific_to_date_of_service,
        IssueDescriptionEnum.progress_marked_not_supported,
        IssueDescriptionEnum.transcription_style_documentation,
        IssueDescriptionEnum.missing_required_field,
        IssueDescriptionEnum.identical_duplicate_content_previous_note,
        IssueDescriptionEnum.one_field_copied_previous_note,
        IssueDescriptionEnum.repetitive_field_multiple_notes,
        IssueDescriptionEnum.plan_generic_continuity_only,
      ]
      if (!validIds.includes(value)) {
        throw new Error('Invalid description enum ID')
      }
      return Number(value)
    }),
    note_id: vine.string().trim().minLength(1),
    version_id: vine.number().withoutDecimals().nullable(),
    status: vine.number().withoutDecimals().optional(),
  })
)

export const updateSmeIssueValidator = vine.compile(
  vine.object({
    reviewer_id: vine.number().withoutDecimals().optional(),
    error_type: vine
      .number()
      .withoutDecimals()
      .in([ErrorTypeEnum.minor, ErrorTypeEnum.moderate, ErrorTypeEnum.critical])
      .optional(),
    issues_related_to: vine
      .number()
      .withoutDecimals()
      .in([
        IssuesRelatedToEnum['p9m9-1'],
        IssuesRelatedToEnum['1hye-1'],
        IssuesRelatedToEnum['6tx9-1'],
        IssuesRelatedToEnum['rb2f-1'],
        IssuesRelatedToEnum['zad8-1'],
        IssuesRelatedToEnum['ugq6-1'],
        IssuesRelatedToEnum['hnfi-1'],
        IssuesRelatedToEnum['9z5t-1'],
        IssuesRelatedToEnum['gm4p-1'],
        IssuesRelatedToEnum['kxgx-7'],
        IssuesRelatedToEnum['kxgx-8'],
        IssuesRelatedToEnum['4lbp-1'],
        IssuesRelatedToEnum.general,
      ])
      .optional(),
    description: vine
      .number()
      .transform((value) => {
        const validIds = [
          IssueDescriptionEnum.no_clinical_interpretation,
          IssueDescriptionEnum.no_modality_intervention_explanation,
          IssueDescriptionEnum.vague_non_specific_language,
          IssueDescriptionEnum.templated_boilerplate_language,
          IssueDescriptionEnum.repetitive_content_within_note,
          IssueDescriptionEnum.not_specific_to_date_of_service,
          IssueDescriptionEnum.progress_marked_not_supported,
          IssueDescriptionEnum.transcription_style_documentation,
          IssueDescriptionEnum.missing_required_field,
          IssueDescriptionEnum.identical_duplicate_content_previous_note,
          IssueDescriptionEnum.one_field_copied_previous_note,
          IssueDescriptionEnum.repetitive_field_multiple_notes,
          IssueDescriptionEnum.plan_generic_continuity_only,
        ]
        if (!validIds.includes(value)) {
          throw new Error('Invalid description enum ID')
        }
        return Number(value)
      })
      .optional(),
    note_id: vine.string().trim().minLength(1).optional(),
    version_id: vine.number().withoutDecimals().nullable(),
    status: vine.number().withoutDecimals().optional(),
  })
)

export type createSmeIssueValidatorInterface = Infer<typeof createSmeIssueValidator>
export type updateSmeIssueValidatorInterface = Infer<typeof updateSmeIssueValidator>
