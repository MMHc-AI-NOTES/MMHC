import WelcomeEmailEvent from '#events/welcome_email_event'
import { WelcomeEmailSendEvent } from '#interfaces/email_event_interface'
import WelcomeEmail from '#mails/welcome_email'
import MissingFieldsEmail from '#mails/missing_fields_email'
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

export const sendMissingFieldsEmail = async (
  practitionerEmail: string,
  practitionerName: string,
  missingFields: string[],
  noteId?: string
) => {
  try {
    await mail.send(
      new MissingFieldsEmail({
        to: practitionerEmail,
        subject: 'Session Fields Missing - Action Required',
        data: {
          practitionerName,
          missingFields,
          noteId,
        },
      })
    )
  } catch (error) {
    console.error('sendMissingFieldsEmail Error:', error)
    throw error
  }
}
