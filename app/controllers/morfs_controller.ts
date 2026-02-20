import Morf from '#models/morf'
import { sendSuccess } from '#services/custom_response_service'
import ErrorService from '#services/error_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class MorfsController {
  public async create(ctx: HttpContext) {
    try {
      const body = ctx.request.body()
      console.log('🚀 ~ MorfsController ~ create ~ body:', body)

      await Morf.create({
        noteId: body.NoteId,
        data: body,
      })

      return sendSuccess('Morf created successfully', body)
    } catch (error) {
      console.log('Morf creation error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
