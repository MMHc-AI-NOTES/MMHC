import vine from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import { modelAgents } from '#enums/agent_enum'
import { PromptKeyEnum } from '#enums/prompt_key_enum'

// Prompt schema for agent prompts
const agentPromptSchema = vine.object({
  key: vine.enum(Object.values(PromptKeyEnum)),
  prompt: vine.string().trim(),
  model_id: vine.enum(modelAgents),
  temperature: vine.number().optional(),
  top_p: vine.number().optional().nullable(),
  top_k: vine.number().withoutDecimals().optional().nullable(),
})

export const createAgentValidator = vine.compile(
  vine.object({
    name: vine.string().trim(),
    model: vine.enum(modelAgents),
    temperature: vine
      .number()
      .optional()
      .transform((value) => value ?? 1),
    top_p: vine
      .number()
      .optional()
      .transform((value) => value ?? 0.9),
    top_k: vine
      .number()
      .withoutDecimals()
      .optional()
      .transform((value) => value ?? 250),
    previous_section: vine.array(vine.number().positive()).optional(),
    description: vine.string().trim().nullable().optional(),
    prompt: vine.string().trim().optional(),
    isActive: vine.boolean().optional(),
    is_default: vine
      .boolean()
      .optional()
      .transform((value) => value ?? false),
    // New field for multiple prompts
    prompts: vine.array(agentPromptSchema).optional(),
  })
)

export type createAgentValidatorInterface = Infer<typeof createAgentValidator>

export const updateAgentValidator = vine.compile(
  vine.object({
    name: vine.string().trim().optional(),
    model: vine.enum(modelAgents).optional(),
    temperature: vine.number().optional(),
    top_p: vine.number().optional(),
    top_k: vine.number().withoutDecimals().optional(),
    previous_section: vine.array(vine.number().positive()).optional(),
    description: vine.string().trim().nullable().optional(),
    prompt: vine.string().trim().optional(),
    isActive: vine.boolean().optional(),
    is_default: vine.boolean().optional(),
    // New field for updating prompts
    prompts: vine.array(agentPromptSchema).optional(),
  })
)

export type updateAgentValidatorInterface = Infer<typeof updateAgentValidator>

export const agentIdValidator = vine.compile(
  vine.object({
    agentId: vine.number().withoutDecimals(),
  })
)

export type agentIdValidatorInterface = Infer<typeof agentIdValidator>
