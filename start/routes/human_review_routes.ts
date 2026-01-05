import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const HumanReviewController = (): Promise<typeof import('#controllers/human_review_controller')> =>
  import('#controllers/human_review_controller')

router
  .group(() => {
    router.post('/listing', [HumanReviewController, 'listing'])
    router.get('/:id', [HumanReviewController, 'show'])
    router.post('/', [HumanReviewController, 'create'])
    router.patch('/:id', [HumanReviewController, 'update'])
    router.delete('/:id', [HumanReviewController, 'destroy'])
  })
  .prefix('api/human-reviews')
  .use(middleware.auth())
