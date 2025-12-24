import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const PatientController = () => import('#controllers/patient_controller')

router
  .group(() => {
    router.post('/listing', [PatientController, 'listing'])
  })
  .prefix('api/patients')
  .use(middleware.auth())
