import { HttpContext } from '@adonisjs/core/http'

export default class ErrorService {
  private static formatErrors(errors: any) {
    if (Array.isArray(errors)) {
      return errors
    }

    return [
      {
        message: errors.message || errors,
        rule: errors.rule || 'unknown',
        field: errors.field || 'unknown',
      },
    ]
  }

  public static handleValidationError(ctx: HttpContext, error: any) {
    const formattedErrors = this.formatErrors(error.messages)

    return ctx.response.status(200).json({
      status: false,
      message: 'Validation failure',
      errors: formattedErrors,
    })
  }

  public static handleDatabaseError(ctx: HttpContext, error: any) {
    const formattedErrors = this.formatErrors(error.message || error)

    return ctx.response.status(200).json({
      status: false,
      message: 'Database error',
      errors: formattedErrors,
    })
  }

  public static handleAuthenticationError(ctx: HttpContext, error: any) {
    const formattedErrors = this.formatErrors(error.message || error)

    return ctx.response.status(401).json({
      status: false,
      message: 'Authentication error',
      errors: formattedErrors,
    })
  }

  public static handleGenericError(ctx: HttpContext, error: any) {
    const formattedErrors = this.formatErrors(error.message || 'An unexpected error occurred')

    return ctx.response.status(200).json({
      status: false,
      message: 'Something went wrong',
      errors: formattedErrors,
    })
  }

  public static handleError(ctx: HttpContext, error: any) {
    if (error.code === 'E_VALIDATION_ERROR') {
      return this.handleValidationError(ctx, error)
    }

    if (error.code === 'E_AUTHENTICATION_ERROR') {
      return this.handleAuthenticationError(ctx, error)
    }

    if (error.code === 'E_DATABASE_ERROR') {
      return this.handleDatabaseError(ctx, error)
    }

    return this.handleGenericError(ctx, error)
  }
}
