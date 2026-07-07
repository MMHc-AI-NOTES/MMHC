import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import { invokeMcpSessionReview } from '#services/mcp_session_review_service'
import { invokeMcpSessionReviewValidator } from '#validators/mcp_session_review_validator'

export default class McpSessionReviewController {
  public async invoke(ctx: HttpContext) {
    try {
      const payload = await invokeMcpSessionReviewValidator.validate(ctx.request.body())
      return await invokeMcpSessionReview(payload)
    } catch (error) {
      console.log('MCP session review invoke error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
