import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const CptCodeController = (): Promise<typeof import('#controllers/cpt_code_controller')> =>
  import('#controllers/cpt_code_controller')

router
  .group(() => {
    router.get('/', [CptCodeController, 'listing'])
  })
  .prefix('api/cpt-codes')
  .use(middleware.auth())
