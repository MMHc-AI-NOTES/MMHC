import type { HttpContext } from '@adonisjs/core/http'
import {
  listErrorTypes,
  getErrorType,
  createErrorType,
  updateErrorType,
  deleteErrorType,
} from '#services/error_type_service'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createErrorTypeValidator,
  updateErrorTypeValidator,
} from '#validators/error_type_validator'
import ErrorService from '#services/error_service'
import vine from '@vinejs/vine'
import logger from '@adonisjs/core/services/logger'

const errorTypeIdValidator = vine.compile(
  vine.object({
    id: vine.number().withoutDecimals(),
  })
)

export default class ErrorTypeController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const errorTypesResponse = await listErrorTypes(page, pageSize, filters, sorts)
      return errorTypesResponse
    } catch (error) {
      logger.error('Error type listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { id } = await errorTypeIdValidator.validate(ctx.params)
      const response = await getErrorType(id)
      return response
    } catch (error) {
      logger.error('Error type getting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async create(ctx: HttpContext) {
    try {
      const payload = await createErrorTypeValidator.validate(ctx.request.body())
      const errorTypeResponse = await createErrorType(payload)
      return errorTypeResponse
    } catch (error) {
      logger.error('Error type creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { id } = await errorTypeIdValidator.validate(ctx.params)
      const payload = await updateErrorTypeValidator.validate(ctx.request.body())
      const response = await updateErrorType(id, payload)
      return response
    } catch (error) {
      logger.error('Error type updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async destroy(ctx: HttpContext) {
    try {
      const { id } = await errorTypeIdValidator.validate(ctx.params)
      const response = await deleteErrorType(id)
      return response
    } catch (error) {
      logger.error('Error type deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
