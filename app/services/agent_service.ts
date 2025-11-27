import Agent, { FILTER_AGENT_ENUM, SORT_AGENT_ENUM } from '#models/agent'
import { agentModelKeys } from '#enums/agent_enum'
import { aiDefaultConfig } from '#helpers/gemini_safety_config'
import { applyFilters } from '#services/apply_filter'
import { paginateQuery } from '#services/apply_pagination'
import { applySorting } from '#services/apply_sorting'
import {
  createAgentValidatorInterface,
  updateAgentValidatorInterface,
} from '#validators/agent_validator'
import { sendError, sendSuccess } from '#services/custom_response_service'
import { setDefaultAgent } from '#services/agent_default_service'

const fetchAgentById = async (agent_id: number) => {
  const agent = await Agent.query().where('id', agent_id).first()
  if (!agent) {
    throw new Error(`Agent with ID: ${agent_id} does not exist`)
  }

  if (agent.previousSection) {
    try {
      agent.previousSection = JSON.parse(agent.previousSection)
    } catch {
      // keep original string
    }
  }

  return agent
}

export const createAgent = async (reqData: createAgentValidatorInterface) => {
  try {
    const existingAgent = await Agent.query().where('name', reqData.name).first()
    if (existingAgent) {
      throw new Error('Agent with name already exists')
    }

    const agentKey = reqData.name.replace(/\s+/g, '_').toUpperCase()

    const agentData = {
      name: reqData.name,
      agentKey: agentKey,
      model: reqData.model,
      temperature: reqData.temperature ?? aiDefaultConfig.temperature,
      topP: reqData.top_p ?? aiDefaultConfig.top_p ?? null,
      topK: reqData.top_k ?? aiDefaultConfig.top_k ?? null,
      previousSection: reqData.previous_section?.length
        ? JSON.stringify(reqData.previous_section)
        : null,
      prompt: reqData.prompt,
      description: reqData.description,
      isActive: reqData.isActive ?? true,
      isDefault: reqData.is_default ?? false,
      aiSafetySettings: null,
    }
    const agent = await Agent.create(agentData)
    if (agent.previousSection) {
      try {
        agent.previousSection = JSON.parse(agent.previousSection)
      } catch {
        // keep string if parsing fails
      }
    }

    if (agent.isDefault) {
      await setDefaultAgent(agent.id)
    }

    return sendSuccess('Agent created successfully', agent)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const getAgentById = async (agent_id: number) => {
  try {
    const agent = await fetchAgentById(agent_id)
    return sendSuccess('Agent details', agent)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const deleteAgent = async (agent_id: number) => {
  try {
    const agent = await fetchAgentById(agent_id)
    if (agent.isDefault) {
      throw new Error('Default agent cannot be deleted')
    }
    await agent.softDelete()
    return sendSuccess('Agent deleted successfully', agent)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const updateAgent = async (payload: updateAgentValidatorInterface, agent_id: number) => {
  try {
    const agent = await fetchAgentById(agent_id)
    if (agent.isDefault === true && payload.isActive === false) {
      throw new Error('Default Agents cannot be disabled')
    }

    if (payload.name) {
      const existingAgent = await Agent.query()
        .where('name', payload.name)
        .andWhereNot('id', agent_id)
        .first()
      if (existingAgent) {
        throw new Error(`Agent with name '${payload.name}' already exists`)
      }
    }

    const agentPayload: any = { ...payload }

    if (agentPayload.model && agentPayload.model !== agent.model) {
      const settings = await getagentDefaultSettings(agentPayload.model)
      if (settings) {
        agentPayload.temperature = agentPayload.temperature ?? settings.temperature
        agentPayload.top_p = agentPayload.top_p ?? settings.top_p ?? null
        agentPayload.top_k = agentPayload.top_k ?? settings.top_k ?? null
      }
    }

    if (agentPayload.previous_section?.length) {
      agentPayload.previousSection = JSON.stringify(agentPayload.previous_section)
      delete agentPayload.previous_section
    } else {
      agentPayload.previousSection = null
      delete agentPayload.previous_section
    }

    // Map snake_case to camelCase
    const mappedPayload: any = {}
    if (agentPayload.name !== undefined) mappedPayload.name = agentPayload.name
    if (agentPayload.model !== undefined) mappedPayload.model = agentPayload.model
    if (agentPayload.temperature !== undefined) mappedPayload.temperature = agentPayload.temperature
    if (agentPayload.top_p !== undefined) mappedPayload.topP = agentPayload.top_p
    if (agentPayload.top_k !== undefined) mappedPayload.topK = agentPayload.top_k
    if (agentPayload.description !== undefined) mappedPayload.description = agentPayload.description
    if (agentPayload.prompt !== undefined) mappedPayload.prompt = agentPayload.prompt
    if (agentPayload.isActive !== undefined) mappedPayload.isActive = agentPayload.isActive
    if (agentPayload.is_default !== undefined) mappedPayload.isDefault = agentPayload.is_default
    if (agentPayload.previousSection !== undefined)
      mappedPayload.previousSection = agentPayload.previousSection

    await agent.merge(mappedPayload).save()
    // Parse previousSection if it exists and is valid JSON
    if (agent.previousSection) {
      try {
        agent.previousSection = JSON.parse(agent.previousSection)
      } catch {
        // If parsing fails, keep as string
      }
    }

    if (agentPayload.is_default === true) {
      await setDefaultAgent(agent.id)
    }

    return sendSuccess('Agent updated successfully', agent)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const listAgents = async (
  page?: number,
  pageSize?: number,
  filters?: any,
  sorts?: any,
  isAdminRoute: boolean = false
) => {
  try {
    let query: any
    let filterData: any
    let sortAgent: any
    let agentListing = Agent.query()
    if (!isAdminRoute) {
      agentListing = agentListing.andWhere('is_active', true)
    }
    if (filters?.length) {
      filterData = applyFilters(agentListing, filters, FILTER_AGENT_ENUM)
    }
    if (filterData?.status === false) {
      return sendError(filterData.message)
    }

    query = filterData?.query ?? agentListing
    if (!sorts?.length) {
      query = query.orderBy('id', 'desc')
    }

    if (sorts?.length) {
      sortAgent = applySorting(query, sorts, SORT_AGENT_ENUM)
      if (sortAgent?.status) {
        return sendError(sortAgent.message)
      }
    }
    let sortQuery = sortAgent?.query ?? query
    let agentListingPaginated = await paginateQuery(sortQuery, pageSize, page)
    for (const index in agentListingPaginated['rows']) {
      const row = agentListingPaginated['rows'][index]
      if (row.previousSection) {
        try {
          row.previousSection = JSON.parse(row.previousSection)
        } catch {
          // If parsing fails, keep as string
        }
      }
    }
    return sendSuccess('Agents listed successfully', {
      count: agentListingPaginated['rows'].length,
      total_count: agentListingPaginated.total,
      total_page_count: agentListingPaginated.lastPage,
      page: agentListingPaginated.currentPage,
      page_size: agentListingPaginated.perPage,
      data: agentListingPaginated['rows'].map((agent: any) => ({
        ...agent.serialize(),
      })),
    })
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const getagentDefaultSettings = async (model: string) => {
  try {
    // Free Claude Haiku models use temperature + top_p/top_k controls
    if (
      model === agentModelKeys.CLAUDE_3_HAIKU ||
      model === agentModelKeys.CLAUDE_3_5_HAIKU_V2 ||
      model === agentModelKeys.CLAUDE_3_5_HAIKU_V1
    ) {
      return {
        temperature: aiDefaultConfig.temperature,
        top_p: aiDefaultConfig.top_p ?? null,
        top_k: aiDefaultConfig.top_k ?? null,
      }
    }
    return null
  } catch (error) {
    console.log('Error in getDefault agent settings', error)
    throw error
  }
}
