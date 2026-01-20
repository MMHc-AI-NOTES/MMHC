import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const UsersController = () => import('#controllers/user_controller')

router
  .group(() => {
    router.post('/', [UsersController, 'create']).use(middleware.superAdmin())
    router.patch('/:userId', [UsersController, 'update'])
    router.delete('/:userId', [UsersController, 'delete']).use(middleware.superAdmin())
    router
      .post('/resend-onboarding/:userId', [UsersController, 'resendOnboardingEmail'])
      .use(middleware.superAdmin())

    router.get('/:userId', [UsersController, 'show'])
    router.post('/listing', [UsersController, 'listing'])
  })
  .prefix('api/users')
  .use(middleware.auth())

// Public onboarding route (no auth required)
router.post('/api/users/onboarding', [UsersController, 'completeOnboarding'])
