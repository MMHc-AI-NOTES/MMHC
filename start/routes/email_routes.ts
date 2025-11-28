import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const EmailControllers = () => import('#controllers/emails_controller')

router
  .group(() => {
    router.get('/', [EmailControllers, 'welcomeEmail'])
  })
  .prefix('api/emails')
  .use(middleware.auth())
