import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const SmeIssueTemplateController = (): Promise<
  typeof import('#controllers/sme_issue_template_controller')
> => import('#controllers/sme_issue_template_controller')

router
  .group(() => {
    router.post('/listing', [SmeIssueTemplateController, 'listing'])
    router.get('/:id', [SmeIssueTemplateController, 'show'])
    router.post('', [SmeIssueTemplateController, 'create'])
    router.patch('/:id', [SmeIssueTemplateController, 'update'])
    router.delete('/:id', [SmeIssueTemplateController, 'destroy'])
  })
  .prefix('api/sme-issues-templates')
  .use(middleware.auth())
