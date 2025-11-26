import Agent from '#models/agent'

/**
 * Ensures only one agent is marked as default.
 * Sets the provided agentId as default and clears the flag on all others.
 */
export const setDefaultAgent = async (agentId: number) => {
  await Agent.query().where('id', '!=', agentId).andWhere('is_default', true).update({
    is_default: false,
  })

  await Agent.query().where('id', agentId).update({
    is_default: true,
  })
}

