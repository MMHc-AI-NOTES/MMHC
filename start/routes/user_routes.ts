import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const UsersController = () => import('#controllers/user_controller')

router
  .group(() => {
    router.post('/', [UsersController, 'create'])
    router.patch('/:userId', [UsersController, 'update'])
    router.delete('/:userId', [UsersController, 'delete'])

    router.get('/:userId', [UsersController, 'show'])
    router.post('/listing', [UsersController, 'listing'])
  })
  .prefix('api/users')
  .use(middleware.auth())
