import {
  chatIdValidator,
  createChatValidator,
  updateChatValidator,
  updateChatScoreValidator,
} from '#validators/chat_validator'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createChat,
  deleteChat,
  getChatById,
  listChats,
  updateChat,
  reevaluateChat,
  updateChatScore,
} from '#services/chat_service'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import logger from '@adonisjs/core/services/logger'

export default class ChatController {
  public async create(ctx: HttpContext) {
    try {
      const payload = await createChatValidator.validate(ctx.request.body())
      const user = ctx.auth.getUserOrFail()
      const chatResponse = await createChat(payload, user.id, undefined, ctx)
      return chatResponse
    } catch (error) {
      logger.error('chat creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const chatResponse = await getChatById(chatId)
      return chatResponse
    } catch (error) {
      logger.error('chat getting by id error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const payload = await updateChatValidator.validate(ctx.request.body())
      const chatResponse = await updateChat(payload, chatId)
      return chatResponse
    } catch (error) {
      logger.error('chat updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async updateScore(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const payload = await updateChatScoreValidator.validate(ctx.request.body())
      return await updateChatScore(chatId, payload)
    } catch (error) {
      logger.error('chat score updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async delete(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const chatResponse = await deleteChat(chatId)
      return chatResponse
    } catch (error) {
      logger.error('chat deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const chatResponse = await listChats(page, pageSize, filters, sorts)
      return chatResponse
    } catch (error) {
      logger.error('chat listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async reevaluate(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const chatResponse = await reevaluateChat(chatId)
      return chatResponse
    } catch (error) {
      logger.error('chat re-evaluation error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
