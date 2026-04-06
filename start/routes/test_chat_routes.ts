import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const TestChatController = () => import('#controllers/test_chat_controller')

router
  .group(() => {
    router.post('/chat', [TestChatController, 'chat'])
  })
  .prefix('api/test')
  .use(middleware.auth())
