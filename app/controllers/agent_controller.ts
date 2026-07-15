import {
  agentIdValidator,
  createAgentValidator,
  updateAgentValidator,
} from '#validators/agent_validator'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createAgent,
  deleteAgent,
  getAgentById,
  listAgents,
  updateAgent,
} from '#services/agent_service'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'
import logger from '@adonisjs/core/services/logger'
export default class AgentsController {
  public async addAgent(ctx: HttpContext) {
    try {
      const payload = await createAgentValidator.validate(ctx.request.body())
      const agentResponse = await createAgent(payload)
      return agentResponse
    } catch (error) {
      logger.error('agent creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { agentId } = await agentIdValidator.validate(ctx.params)
      const agentResponse = await getAgentById(agentId)
      return agentResponse
    } catch (error) {
      logger.error('agent getting by id error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { agentId } = await agentIdValidator.validate(ctx.params)
      const payload = await updateAgentValidator.validate(ctx.request.body())
      const agentResponse = await updateAgent(payload, agentId)
      return agentResponse
    } catch (error) {
      logger.error('agent updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async delete(ctx: HttpContext) {
    try {
      const { agentId } = await agentIdValidator.validate(ctx.params)
      const agentResponse = await deleteAgent(agentId)
      return agentResponse
    } catch (error) {
      logger.error('agent deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const agentResponse = await listAgents(page, pageSize, filters, sorts)
      return agentResponse
    } catch (error) {
      logger.error('agent listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
