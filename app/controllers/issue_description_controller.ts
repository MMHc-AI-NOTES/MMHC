import type { HttpContext } from '@adonisjs/core/http'
import {
  listIssueDescriptions,
  getIssueDescription,
  createIssueDescription,
  updateIssueDescription,
  deleteIssueDescription,
} from '#services/issue_description_service'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createIssueDescriptionValidator,
  updateIssueDescriptionValidator,
} from '#validators/issue_description_validator'
import ErrorService from '#services/error_service'
import vine from '@vinejs/vine'

const issueDescriptionIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export default class IssueDescriptionController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const issueDescriptionsResponse = await listIssueDescriptions(page, pageSize, filters, sorts)
      return issueDescriptionsResponse
    } catch (error) {
      console.log('Issue description listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await issueDescriptionIdValidator.validate(ctx.params)
      const response = await getIssueDescription(id)
      return response
    } catch (error) {
      console.log('Issue description getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async create(ctx: HttpContext) {
    try {
      const payload = await createIssueDescriptionValidator.validate(ctx.request.body())
      const issueDescriptionResponse = await createIssueDescription(payload)
      return issueDescriptionResponse
    } catch (error) {
      console.log('Issue description creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { id } = await issueDescriptionIdValidator.validate(ctx.params)
      const payload = await updateIssueDescriptionValidator.validate(ctx.request.body())
      const response = await updateIssueDescription(id, payload)
      return response
    } catch (error) {
      console.log('Issue description updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await issueDescriptionIdValidator.validate(ctx.params)
      const response = await deleteIssueDescription(id)
      return response
    } catch (error) {
      console.log('Issue description deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
