import WelcomeEmailEvent from '#events/welcome_email_event'
import { WelcomeEmailSendEvent } from '#interfaces/email_event_interface'
import WelcomeEmail from '#mails/welcome_email'
import UserInviteEmail from '#mails/user_invite_email'
import mail from '@adonisjs/mail/services/main'
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

export const sendUserInviteEmail = async (email: string, invitationLink: string) => {
  try {
    await mail.send(
      new UserInviteEmail({
        to: email,
        subject: 'You have been invited to MMHF',
        data: {
          invitationLink,
        },
      })
    )
  } catch (error) {
    console.log('sendUserInviteEmail Error:', error)
    throw error
  }
}
