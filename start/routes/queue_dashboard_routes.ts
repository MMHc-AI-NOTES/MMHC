import router from '@adonisjs/core/services/router'

const QueueDashboardController = (): Promise<
  typeof import('#controllers/queue_dashboard_controller')
> => import('#controllers/queue_dashboard_controller')

router
  .group(() => {
    router.get('/', [QueueDashboardController, 'index'])
    router.get('/stats', [QueueDashboardController, 'stats'])
  })
  .prefix('admin/queues')
