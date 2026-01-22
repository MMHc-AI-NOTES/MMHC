import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const IssueDescriptionController = (): Promise<
  typeof import('#controllers/issue_description_controller')
> => import('#controllers/issue_description_controller')

router
  .group(() => {
    router.post('/listing', [IssueDescriptionController, 'listing'])
    router.get('/:id', [IssueDescriptionController, 'show'])
    router.post('/', [IssueDescriptionController, 'create'])
    router.patch('/:id', [IssueDescriptionController, 'update'])
    router.delete('/:id', [IssueDescriptionController, 'destroy'])
  })
  .prefix('api/issue-descriptions')
  .use(middleware.auth())
