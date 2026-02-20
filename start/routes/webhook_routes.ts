import router from '@adonisjs/core/services/router'

const WebhookController = () => import('#controllers/webhook_controller')

// Main webhook endpoint: now uses BullMQ, but session creation logic
// is identical to main branch via createSessionFromWebhook in the worker.
router.post('/api/webhook/session', [WebhookController, 'handle'])

// Optional legacy/test endpoint to run synchronously if needed
router.post('/api/webhook/test/session', [WebhookController, 'session'])
