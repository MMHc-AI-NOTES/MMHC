import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const NotesController = () => import('#controllers/note_controller')

router
  .group(() => {
    router.post('/listing', [NotesController, 'listing'])
    router.get('/:noteId', [NotesController, 'getWithChats'])
  })
  .prefix('api/notes')
  .use(middleware.auth())
