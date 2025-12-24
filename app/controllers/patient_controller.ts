import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import { patientListing } from '#services/patient_service'
import { paginationValidator } from '#validators/pagination_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class PatientController {
  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const patientResponse = await patientListing(page, pageSize, filters, sorts)
      return sendSuccess('Patients listed successfully', patientResponse)
    } catch (error) {
      console.log('Patient listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
