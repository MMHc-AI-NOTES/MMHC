import {
  createSmeIssueTemplateValidator,
  updateSmeIssueTemplateValidator,
} from '#validators/sme_issue_template_validator'
import {
  createSmeIssueTemplate,
  listSmeIssueTemplates,
  getSmeIssueTemplate,
  updateSmeIssueTemplate,
  deleteSmeIssueTemplate,
} from '#services/sme_issue_template_service'
import { paginationValidator } from '#validators/pagination_validator'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'
import vine from '@vinejs/vine'

const smeIssueTemplateIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export default class SmeIssueTemplateController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize } = await paginationValidator.validate(ctx.request.body())
      const templates = await listSmeIssueTemplates(page, pageSize)
      return sendSuccess('SME issue templates listed successfully', templates)
    } catch (error) {
      console.log('SME issue template listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await smeIssueTemplateIdValidator.validate(ctx.params)
      const response = await getSmeIssueTemplate(id)
      return response
    } catch (error) {
      console.log('SME issue template getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async create(ctx: HttpContext) {
    try {
      const payload = await createSmeIssueTemplateValidator.validate(ctx.request.body())
      const response = await createSmeIssueTemplate(payload)
      return response
    } catch (error) {
      console.log('SME issue template creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { id } = await smeIssueTemplateIdValidator.validate(ctx.params)
      const payload = await updateSmeIssueTemplateValidator.validate(ctx.request.body(), {
        meta: { templateId: id },
      })
      const response = await updateSmeIssueTemplate(id, payload)
      return response
    } catch (error) {
      console.log('SME issue template updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await smeIssueTemplateIdValidator.validate(ctx.params)
      const response = await deleteSmeIssueTemplate(id)
      return response
    } catch (error) {
      console.log('SME issue template deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
