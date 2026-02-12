import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const TestController = (): Promise<typeof import('#controllers/test_controller')> =>
  import('#controllers/test_controller')

router
  .group(() => {
    router.post('/chat', [TestController, 'chat'])
  })
  .prefix('api/test')
  .use(middleware.auth())
