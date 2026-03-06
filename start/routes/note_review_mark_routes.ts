import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const NoteReviewMarkController = (): Promise<
  typeof import('#controllers/note_review_mark_controller')
> => import('#controllers/note_review_mark_controller')

router
  .group(() => {
    router.patch('/mark', [NoteReviewMarkController, 'update'])
    router.get('/:note_id/:reviewer_id/:note_version_id', [NoteReviewMarkController, 'show'])
  })
  .prefix('api/note-review-marks')
  .use(middleware.auth())
