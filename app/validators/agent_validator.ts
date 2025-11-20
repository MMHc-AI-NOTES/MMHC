import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { agentTypes, modelAgents } from '#enums/agent_enum'

export const createAgentValidator = vine.compile(
  vine.object({
    name: vine.string().trim(),
    model: vine.enum(modelAgents),
    use_context: vine
      .boolean()
      .optional()
      .transform((value) => value ?? false),
    temperature: vine
      .number()
      .optional()
      .transform((value) => value ?? 1),
    frequency_penalty: vine
      .number()
      .optional()
      .transform((value) => value ?? 1),
    presence_penalty: vine
      .number()
      .optional()
      .transform((value) => value ?? 1),
    previous_section: vine.array(vine.number().positive()).optional(),
    transcript: vine
      .boolean()
      .optional()
      .transform((value) => value ?? false),
    description: vine.string().trim().optional(),
    prompt: vine.string().trim().optional(),
    isActive: vine.boolean().optional(),
    type: vine.enum(Object.values(agentTypes)),
  })
)

export type createAgentValidatorInterface = Infer<typeof createAgentValidator>

export const updateAgentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().optional(),
    model: vine.enum(modelAgents).optional(),
    use_context: vine.boolean().optional(),
    temperature: vine.number().optional(),
    frequency_penalty: vine.number().optional(),
    presence_penalty: vine.number().optional(),
    previous_section: vine.array(vine.number().positive()).optional(),
    transcript: vine.boolean().optional(),
    description: vine.string().trim().optional(),
    prompt: vine.string().trim().optional(),
    isActive: vine.boolean().optional(),
  })
)

export type updateAgentValidatorInterface = Infer<typeof updateAgentValidator>

export const agentIdValidator = vine.compile(
  vine.object({
    agentId: vine.number().withoutDecimals(),
  })
)

export type agentIdValidatorInterface = Infer<typeof agentIdValidator>
