import {
  createSmeIssueValidator,
  updateSmeIssueValidator,
  deleteSmeIssuesByNoteAndVersionValidator,
  assignSmeIssueToManagerValidator,
} from '#validators/sme_issue_validator'
import {
  createSmeIssue,
  listSmeIssues,
  getSmeIssue,
  updateSmeIssue,
  deleteSmeIssue,
  deleteSmeIssuesByNoteAndVersion,
  assignSmeIssueToManager,
} from '#services/sme_issue_service'
import { paginationValidator } from '#validators/pagination_validator'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import { sendSuccess } from '#services/custom_response_service'
import vine from '@vinejs/vine'
import { UserTypeEnum } from '#enums/user_type_enum'
import logger from '@adonisjs/core/services/logger'

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
      logger.error('SME issue listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await smeIssueIdValidator.validate(ctx.params)
      const response = await getSmeIssue(id)
      return response
    } catch (error) {
      logger.error('SME issue getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async create(ctx: HttpContext) {
    try {
      const payload = await createSmeIssueValidator.validate(ctx.request.body())
      const currentUser = ctx.auth.getUserOrFail()
      if (currentUser.type !== UserTypeEnum.superAdmin) {
        payload.reviewer_id = currentUser.id
      }
      const smeIssueResponse = await createSmeIssue(payload)
      return smeIssueResponse
    } catch (error) {
      logger.error('SME issue creating error', error)
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
      logger.error('SME issue updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await smeIssueIdValidator.validate(ctx.params)
      const response = await deleteSmeIssue(id)
      return response
    } catch (error) {
      logger.error('SME issue deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async deleteByNoteAndVersion(ctx: HttpContext) {
    try {
      const {
        note_id: noteId,
        version_id: versionId,
        reviewer_id: reviewerId,
      } = await deleteSmeIssuesByNoteAndVersionValidator.validate(ctx.params)
      const response = await deleteSmeIssuesByNoteAndVersion(noteId, versionId, reviewerId)
      return response
    } catch (error) {
      logger.error('SME Issues deleting by note and version error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async assignToManager(ctx: HttpContext) {
    try {
      const payload = await assignSmeIssueToManagerValidator.validate(ctx.request.body())
      const currentUser = ctx.auth.getUserOrFail()
      const response = await assignSmeIssueToManager(payload, currentUser.id, ctx)
      return response
    } catch (error) {
      logger.error('SME issue assigning to manager error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
