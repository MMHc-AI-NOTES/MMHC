import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.post('register', [AuthController, 'register'])
    router.post('login', [AuthController, 'login'])
    router.post('impersonate', [AuthController, 'impersonate'])
    router.get('/me', [AuthController, 'getUserByToken']).use([middleware.auth()])
  })
  .prefix('api')
