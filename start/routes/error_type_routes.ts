import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ErrorTypeController = (): Promise<typeof import('#controllers/error_type_controller')> =>
  import('#controllers/error_type_controller')

router
  .group(() => {
    router.post('/listing', [ErrorTypeController, 'listing'])
    router.get('/:id', [ErrorTypeController, 'show'])
    router.post('/', [ErrorTypeController, 'create'])
    router.patch('/:id', [ErrorTypeController, 'update'])
    router.delete('/:id', [ErrorTypeController, 'destroy'])
  })
  .prefix('api/error-types')
  .use(middleware.auth())
