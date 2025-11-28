import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AgentsController = () => import('#controllers/agent_controller')

router
  .group(() => {
    router.post('/', [AgentsController, 'addAgent'])
    router.get('/:agentId', [AgentsController, 'show'])
    router.patch('/:agentId', [AgentsController, 'update'])
    router.delete('/:agentId', [AgentsController, 'delete'])
    router.post('/listing', [AgentsController, 'listing'])
  })
  .prefix('api/agents')
  .use(middleware.auth())
