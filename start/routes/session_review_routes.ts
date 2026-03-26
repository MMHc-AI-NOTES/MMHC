import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SessionReviewController = () => import('#controllers/session_review_controller')

router
  .group(() => {
    router.post('/invoke', [SessionReviewController, 'invoke'])
  })
  .prefix('api/session-reviews')
  .use(middleware.auth())
