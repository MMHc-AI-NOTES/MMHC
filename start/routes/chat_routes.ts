import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ChatController = () => import('#controllers/chat_controller')

router.group(() => {
  router.post('/direct', [ChatController, 'directChat']).prefix('api/chats')
  router.post('/directChole', [ChatController, 'directChat2']).prefix('api/chats')
  router.get('/directTest', [ChatController, 'outputAggregator']).prefix('api/chats')
})

router
  .group(() => {
    router.post('/', [ChatController, 'create'])
    router.get('/:chatId', [ChatController, 'show'])
    router.put('/:chatId', [ChatController, 'update'])
    router.delete('/:chatId', [ChatController, 'delete'])
    router.post('/listing', [ChatController, 'listing'])
    router.post('/:chatId/reevaluate', [ChatController, 'reevaluate'])
  })
  .prefix('api/chats')
  .use(middleware.auth())
