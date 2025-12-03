import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const HumanReviewController = () => import('#controllers/human_review_controller')

router
  .group(() => {
    router.post('/', [HumanReviewController, 'create'])
  })
  .prefix('api/human-reviews')
  .use(middleware.auth())
