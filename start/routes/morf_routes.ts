import router from '@adonisjs/core/services/router'

const MorfsController = (): Promise<typeof import('#controllers/morfs_controller')> =>
  import('#controllers/morfs_controller')

router
  .group(() => {
    router.post('/', [MorfsController, 'create'])
  })
  .prefix('api/morf')
