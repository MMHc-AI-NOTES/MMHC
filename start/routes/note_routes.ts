import router from '@adonisjs/core/services/router'

const NotesController = () => import('#controllers/note_controller')

router
  .group(() => {
    router.post('/listing', [NotesController, 'listing'])
  })
  .prefix('api/notes')
