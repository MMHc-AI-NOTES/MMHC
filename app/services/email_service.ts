import WelcomeEmailEvent from '#events/welcome_email_event'
import { WelcomeEmailSendEvent } from '#interfaces/email_event_interface'
import WelcomeEmail from '#mails/welcome_email'
import mail from '@adonisjs/mail/services/main'
import { frontendRoutesConfig, getFrontendLink } from '#services/frontend_routes_service'

export const dispatchWelcomeEmail = async () => {
  try {
    WelcomeEmailEvent.dispatch({
      to: 'mtariqsajid@gmail.com',
      userEmail: 'mtariqsajid@gmail.com',
    })
  } catch (error) {
    console.log('dispatchWelcomeEmail Error:', error)
  }
}

export const sendWelcomeEmail = async (payload: WelcomeEmailSendEvent) => {
  try {
    await mail.send(
      new WelcomeEmail({
        to: payload.event.to,
        data: { userEmail: payload.event.userEmail },
        subject: 'Welcome Email',
      })
    )
  } catch (error) {
    console.log('sendWelcomeEmail Error:', error)
  }
}

export const sendUserOnboardingEmail = async (email: string, token: string) => {
  try {
    const onboardingLink = getFrontendLink(frontendRoutesConfig.userOnboardingLink, token)

    await mail.send((message) => {
      message
        .to(email)
        .subject('Set up your MMHF account')
        .text(
          `You have been invited to MMHF. Please click the following link to set up your account:\n\n${onboardingLink}\n\nIf you did not expect this email, you can safely ignore it.`
        )
    })
  } catch (error) {
    console.log('sendUserOnboardingEmail Error:', error)
  }
}
