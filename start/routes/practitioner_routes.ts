import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const PractitionerController = () => import('#controllers/practitioner_controller')

router
  .group(() => {
    router.post('/listing', [PractitionerController, 'listing'])
  })
  .prefix('api/practitioners')
  .use(middleware.auth())
