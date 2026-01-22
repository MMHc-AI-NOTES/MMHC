import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { UserTypeEnum } from '#enums/user_type_enum'
import { sendError } from '#services/custom_response_service'

/**
 * SuperAdmin middleware is used to ensure only superAdmin users can access certain routes
 */
export default class SuperAdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()

    if (user.type !== UserTypeEnum.superAdmin) {
      return ctx.response
        .status(403)
        .send(sendError('Access denied. Only superAdmin users can perform this action.'))
    }

    return next()
  }
}
