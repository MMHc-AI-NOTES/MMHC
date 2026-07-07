import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const McpSessionReviewController = () => import('#controllers/mcp_session_review_controller')

router
  .group(() => {
    router.post('/invoke', [McpSessionReviewController, 'invoke'])
  })
  .prefix('api/mcp/session-reviews')
  .use(middleware.auth())
