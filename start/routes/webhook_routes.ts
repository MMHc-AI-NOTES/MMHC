import router from '@adonisjs/core/services/router'

const WebhookController = () => import('#controllers/webhook_controller')

router.post('/api/webhook/session', [WebhookController, 'handle'])
router.post('/api/webhook/test/session', [WebhookController, 'session'])
