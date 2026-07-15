import logger from '@adonisjs/core/services/logger'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { practitionerListing } from '#services/practitioner_service'
import { paginationValidator } from '#validators/pagination_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class PractitionerController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const practitionerResponse = await practitionerListing(page, pageSize, filters, sorts)
      return sendSuccess('Practitioners listed successfully', practitionerResponse)
    } catch (error) {
      logger.error('Practitioner listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
