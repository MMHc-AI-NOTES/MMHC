import WelcomeEmailEvent from '#events/welcome_email_event'
import { WelcomeEmailSendEvent } from '#interfaces/email_event_interface'
import WelcomeEmail from '#mails/welcome_email'
import UserInviteEmail from '#mails/user_invite_email'
import PractitionerSmeIssuesEmail from '#mails/practitioner_sme_issues_email'
import type SmeIssue from '#models/sme_issue'
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

export const sendPractitionerSmeIssuesEmail = async (
  practitionerEmail: string,
  practitionerName: string,
  reviewerName: string,
  noteId: string,
  versionId: number | null | undefined,
  smeIssues: SmeIssue[]
) => {
  try {
    await mail.send(
      new PractitionerSmeIssuesEmail({
        to: practitionerEmail,
        subject: 'SME Issues Added by Reviewer',
        data: {
          practitionerName,
          reviewerName,
          noteId,
          versionId,
          smeIssues: smeIssues.map((issue) => {
            // Access preloaded relationships - they are already loaded in notifyPractitioner
            const errorType = issue.$preloaded?.errorType as any
            const issuesRelatedTo = issue.$preloaded?.issuesRelatedTo as any
            const issueDescription = issue.$preloaded?.issueDescription as any

            // Format the date to a readable format
            let formattedDate = 'N/A'
            if (issue.createdAt) {
              formattedDate = issue.createdAt.toFormat("MMMM dd, yyyy 'at' hh:mm a")
            }

            return {
              id: issue.id,
              errorType: errorType?.name || 'N/A',
              issuesRelatedTo: issuesRelatedTo?.displayName || 'N/A',
              issueDescription: issueDescription?.description || 'N/A',
              status: issue.status === 1 ? 'Active' : issue.status === 2 ? 'Resolved' : 'N/A',
              createdAt: formattedDate,
            }
          }),
        },
      })
    )
  } catch (error) {
    console.log('sendPractitionerSmeIssuesEmail Error:', error)
    throw error
  }
}
