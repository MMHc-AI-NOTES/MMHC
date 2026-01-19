import router from '@adonisjs/core/services/router'

const WebhookController = () => import('#controllers/webhook_controller')

// Webhook routes - no auth middleware, but can use webhook secret for security
router.post('/api/webhook', [WebhookController, 'handle'])

// Legacy webhook endpoint (no auth required)
router.post('/api/webhook/session', [WebhookController, 'session'])
