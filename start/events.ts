import emitter from '@adonisjs/core/services/emitter'
import WelcomeEmailEvent from '#events/welcome_email_event'

emitter.on(WelcomeEmailEvent, async (data: any) => {
  const { sendWelcomeEmail } = await import('#services/email_service')
  await sendWelcomeEmail(data)
})
