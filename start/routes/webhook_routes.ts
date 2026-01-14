import router from '@adonisjs/core/services/router'

const WebhookController = () => import('#controllers/webhook_controller')

// Webhook endpoint (no auth required)
router.post('/api/webhook/session', [WebhookController, 'session'])
