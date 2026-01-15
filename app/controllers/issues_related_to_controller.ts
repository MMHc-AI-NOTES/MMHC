import type { HttpContext } from '@adonisjs/core/http'
import {
  listIssuesRelatedTo,
  getIssuesRelatedTo,
  createIssuesRelatedTo,
  updateIssuesRelatedTo,
  deleteIssuesRelatedTo,
} from '#services/issues_related_to_service'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createIssuesRelatedToValidator,
  updateIssuesRelatedToValidator,
} from '#validators/issues_related_to_validator'
import ErrorService from '#services/error_service'
import vine from '@vinejs/vine'

const issuesRelatedToIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export default class IssuesRelatedToController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const issuesRelatedToResponse = await listIssuesRelatedTo(page, pageSize, filters, sorts)
      return issuesRelatedToResponse
    } catch (error) {
      console.log('Issues related to listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await issuesRelatedToIdValidator.validate(ctx.params)
      const response = await getIssuesRelatedTo(id)
      return response
    } catch (error) {
      console.log('Issues related to getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async create(ctx: HttpContext) {
    try {
      const payload = await createIssuesRelatedToValidator.validate(ctx.request.body())
      const issuesRelatedToResponse = await createIssuesRelatedTo(payload)
      return issuesRelatedToResponse
    } catch (error) {
      console.log('Issues related to creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { id } = await issuesRelatedToIdValidator.validate(ctx.params)
      const payload = await updateIssuesRelatedToValidator.validate(ctx.request.body())
      const response = await updateIssuesRelatedTo(id, payload)
      return response
    } catch (error) {
      console.log('Issues related to updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await issuesRelatedToIdValidator.validate(ctx.params)
      const response = await deleteIssuesRelatedTo(id)
      return response
    } catch (error) {
      console.log('Issues related to deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
