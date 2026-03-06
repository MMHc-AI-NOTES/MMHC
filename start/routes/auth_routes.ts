import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.post('register', [AuthController, 'register'])
    router.post('login', [AuthController, 'login'])
    router.get('logout', [AuthController, 'logout'])
    router.post('impersonate', [AuthController, 'impersonate'])
    router.post('forgot-password', [AuthController, 'forgotPassword'])
    router.post('reset-password', [AuthController, 'resetPassword'])
    router.get('/me', [AuthController, 'getUserByToken']).use([middleware.auth()])
  })
  .prefix('api')
