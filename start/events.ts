import emitter from '@adonisjs/core/services/emitter'
import { sendWelcomeEmail } from '#services/email_service'
import WelcomeEmailEvent from '#events/welcome_email_event'

emitter.on(WelcomeEmailEvent, async (data: any) => {
  await sendWelcomeEmail(data)
})
