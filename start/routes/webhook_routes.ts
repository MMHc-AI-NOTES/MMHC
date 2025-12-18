import router from '@adonisjs/core/services/router'

const WebhookController = () => import('#controllers/webhook_controller')

// Webhook routes - no auth middleware, but can use webhook secret for security
router.post('/api/webhook', [WebhookController, 'handle'])
