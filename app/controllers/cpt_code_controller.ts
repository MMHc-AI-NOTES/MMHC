import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { listCptCodes } from '#services/cpt_code_service'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
export default class CptCodeController {
  public async listing(ctx: HttpContext) {
    try {
      const cptCodeResponse = await listCptCodes()
      return sendSuccess('CPT codes listed successfully', cptCodeResponse)
    } catch (error) {
      logger.error('CPT code listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
