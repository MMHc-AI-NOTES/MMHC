import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SmeIssueController = (): Promise<typeof import('#controllers/sme_issue_controller')> =>
  import('#controllers/sme_issue_controller')

router
  .group(() => {
    router.post('/listing', [SmeIssueController, 'listing'])
    router.get('/:id', [SmeIssueController, 'show'])
    router.post('/', [SmeIssueController, 'create'])
    router.patch('/:id', [SmeIssueController, 'update'])
    router.delete('/:id', [SmeIssueController, 'destroy'])
  })
  .prefix('api/sme-issues')
  .use(middleware.auth())
