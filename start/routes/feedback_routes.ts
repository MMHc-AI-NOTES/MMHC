import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const FeedbackController = () => import('#controllers/feedback_controller')

router
  .group(() => {
    router.post('/', [FeedbackController, 'submit'])
    router.delete('/:id', [FeedbackController, 'destroy'])
    router.get('/:note_id', [FeedbackController, 'show'])
  })
  .prefix('api/feedback')
  .use(middleware.auth())
