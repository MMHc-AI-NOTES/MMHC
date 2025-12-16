import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ManagerReviewController = () => import('#controllers/manager_review_controller')

router
  .group(() => {
    router.post('/listing', [ManagerReviewController, 'listing'])
    router.get('/:id', [ManagerReviewController, 'show'])
    router.patch('/:id', [ManagerReviewController, 'update'])
  })
  .prefix('api/manager-reviews')
  .use(middleware.auth())
