import { createSmeIssueValidator, updateSmeIssueValidator } from '#validators/sme_issue_validator'
import {
  createSmeIssue,
  listSmeIssues,
  getSmeIssue,
  updateSmeIssue,
  deleteSmeIssue,
} from '#services/sme_issue_service'
import { paginationValidator } from '#validators/pagination_validator'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'
import vine from '@vinejs/vine'

const smeIssueIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export default class SmeIssueController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const smeIssueResponse = await listSmeIssues(page, pageSize, filters, sorts)
      return sendSuccess('SME issues listed successfully', smeIssueResponse)
    } catch (error) {
      console.log('SME issue listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await smeIssueIdValidator.validate(ctx.params)
      const response = await getSmeIssue(id)
      return response
    } catch (error) {
      console.log('SME issue getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async create(ctx: HttpContext) {
    try {
      const payload = await createSmeIssueValidator.validate(ctx.request.body())
      const smeIssueResponse = await createSmeIssue(payload)
      return smeIssueResponse
    } catch (error) {
      console.log('SME issue creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { id } = await smeIssueIdValidator.validate(ctx.params)
      const payload = await updateSmeIssueValidator.validate(ctx.request.body())
      const response = await updateSmeIssue(id, payload)
      return response
    } catch (error) {
      console.log('SME issue updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await smeIssueIdValidator.validate(ctx.params)
      const response = await deleteSmeIssue(id)
      return response
    } catch (error) {
      console.log('SME issue deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
