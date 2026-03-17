import WelcomeEmailEvent from '#events/welcome_email_event'
import { WelcomeEmailSendEvent } from '#interfaces/email_event_interface'
import WelcomeEmail from '#mails/welcome_email'
import UserInviteEmail from '#mails/user_invite_email'
import PractitionerSmeIssuesEmail from '#mails/practitioner_sme_issues_email'
import BulkPractitionerSmeIssuesEmail from '#mails/bulk_practitioner_sme_issues_email'
import MissingFieldsEmail from '#mails/missing_fields_email'
import ForgotPasswordEmail from '#mails/forgot_password_email'
import type SmeIssue from '#models/sme_issue'
import Session from '#models/session'
import mail from '@adonisjs/mail/services/main'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import { addDispatchEmailJob, type DispatchEmailJobData } from '#jobs/queues/dispatch_email_queue'
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

export const sendForgotPasswordEmail = async (email: string, resetUrl: string) => {
  try {
    await mail.send(
      new ForgotPasswordEmail({
        to: email,
        subject: 'Reset your password',
        data: {
          resetUrl,
        },
      })
    )
  } catch (error) {
    console.log('sendForgotPasswordEmail Error:', error)
    throw error
  }
}

export const sendPractitionerSmeIssuesEmail = async (
  practitionerEmail: string,
  practitionerName: string,
  reviewerName: string,
  noteId: string,
  versionId: number | null | undefined,
  clientId: string,
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
          clientId,
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

    const session = await Session.query().where('note_id', noteId).first()

    await createAuditLog({
      description: 'SME issues email sent to practitioner',
      action: AuditActionEnum.emailSmeIssues,
      status: true,
      modelType: session ? 'Session' : null,
      modelId: session?.id ?? null,
      noteId: noteId,
      metadata: {
        practitioner_email: practitionerEmail,
        practitioner_name: practitionerName,
        reviewer_name: reviewerName,
        note_id: noteId,
        version_id: versionId ?? null,
        issues_count: smeIssues.length,
      },
    })
  } catch (error) {
    console.log('sendPractitionerSmeIssuesEmail Error:', error)
    throw error
  }
}

export type BulkNoteWithIssues = {
  noteId: string
  versionId: number | null
  versionLabel: string | null
  reviewerName: string
  clientId: string
  smeIssues: Array<{
    id: number
    errorType: string
    issuesRelatedTo: string
    issueDescription: string
    status: string
    createdAt: string
  }>
}

export const sendBulkPractitionerSmeIssuesEmail = async (
  practitionerEmail: string,
  practitionerName: string,
  notesWithIssues: BulkNoteWithIssues[]
) => {
  try {
    await addDispatchEmailJob({
      practitionerEmail,
      practitionerName,
      notesWithIssues,
    })
  } catch (error) {
    throw error
  }
}

export const performBulkPractitionerSmeIssuesEmail = async (payload: DispatchEmailJobData) => {
  const { practitionerEmail, practitionerName, notesWithIssues } = payload

  await mail.send(
    new BulkPractitionerSmeIssuesEmail({
      to: practitionerEmail,
      subject: 'SME Issues Added by Reviewer (Multiple Notes)',
      data: {
        practitionerName,
        notesWithIssues,
      },
    })
  )

  await createAuditLog({
    description: 'Bulk SME issues email sent to practitioner',
    action: AuditActionEnum.emailBulkSmeIssues,
    status: true,
    metadata: {
      practitioner_email: practitionerEmail,
      practitioner_name: practitionerName,
      notes_count: notesWithIssues.length,
    },
  })
}

export const sendMissingFieldsEmail = async (
  practitionerEmail: string,
  practitionerName: string,
  missingFields: string[],
  noteId: string
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

    const session = await Session.query().where('note_id', noteId).first()

    await createAuditLog({
      description: 'Missing fields email sent to practitioner',
      action: AuditActionEnum.emailMissingFields,
      status: true,
      modelType: session ? 'Session' : null,
      modelId: session?.id ?? null,
      noteId: noteId,
      metadata: {
        practitioner_email: practitionerEmail,
        practitioner_name: practitionerName,
        note_id: noteId,
        missing_fields: missingFields,
      },
    })
  } catch (error) {
    console.log('sendMissingFieldsEmail Error:', error)
    throw error
  }
}