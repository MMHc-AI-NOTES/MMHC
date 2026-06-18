import { createMcpChatValidator, mcpChatIdValidator } from '#validators/mcp_chat_validator'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createMcpChat,
  getMcpChatById,
  listMcpChats,
  reevaluateMcpChat,
  scoreMcpNote,
} from '#services/mcp_chat_service'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'

export default class McpChatController {
  /** Score a note via MCP without persisting a chat record */
  public async score(ctx: HttpContext) {
    try {
      const payload = await createMcpChatValidator.validate(ctx.request.body())
      return await scoreMcpNote(payload)
    } catch (error) {
      console.log('MCP score error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async create(ctx: HttpContext) {
    try {
      const payload = await createMcpChatValidator.validate(ctx.request.body())
      const user = ctx.auth.getUserOrFail()
      return await createMcpChat(payload, user.id, ctx)
    } catch (error) {
      console.log('MCP chat create error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { chatId } = await mcpChatIdValidator.validate(ctx.params)
      return await getMcpChatById(chatId)
    } catch (error) {
      console.log('MCP chat show error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async reevaluate(ctx: HttpContext) {
    try {
      const { chatId } = await mcpChatIdValidator.validate(ctx.params)
      return await reevaluateMcpChat(chatId)
    } catch (error) {
      console.log('MCP chat reevaluate error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      return await listMcpChats(page, pageSize, filters, sorts)
    } catch (error) {
      console.log('MCP chat listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
