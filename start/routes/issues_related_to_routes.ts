import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const IssuesRelatedToController = (): Promise<
  typeof import('#controllers/issues_related_to_controller')
> => import('#controllers/issues_related_to_controller')

router
  .group(() => {
    router.post('/listing', [IssuesRelatedToController, 'listing'])
    router.get('/:id', [IssuesRelatedToController, 'show'])
    router.post('/', [IssuesRelatedToController, 'create'])
    router.patch('/:id', [IssuesRelatedToController, 'update'])
    router.delete('/:id', [IssuesRelatedToController, 'destroy'])
  })
  .prefix('api/issues-related-to')
  .use(middleware.auth())
