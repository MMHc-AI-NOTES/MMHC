import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const McpChatController = () => import('#controllers/mcp_chat_controller')

router
  .group(() => {
    router.post('/score', [McpChatController, 'score'])
    router.post('/', [McpChatController, 'create'])
    router.post('/listing', [McpChatController, 'listing'])
    router.get('/:chatId', [McpChatController, 'show'])
    router.post('/:chatId/reevaluate', [McpChatController, 'reevaluate'])
  })
  .prefix('api/mcp/chats')
  .use(middleware.auth())
