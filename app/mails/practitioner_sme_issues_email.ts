import { BaseMail } from '@adonisjs/mail'
import { EmailInterface } from '#interfaces/email_base_interface'
import { emailConfig } from '#config/services'
import edge from 'edge.js'
import { emailCompanyLogo, appConfig } from '#config/services'

export default class PractitionerSmeIssuesEmail extends BaseMail {
  from = ''
  subject = ''
  data: EmailInterface

  constructor(data: EmailInterface) {
    super()
    this.data = data
    this.from = emailConfig.from
    this.subject = this.data.subject || 'SME Issues Added by Reviewer'
  }

  prepare() {
    edge.global('companyLogo', emailCompanyLogo)
    const { bcc, cc, data } = this.data

    const to = emailConfig.isTest ? emailConfig.testAddresses.join(',') : this.data.to

    this.message
      .to(to)
      .bcc(bcc || [])
      .cc(cc || [])
      .htmlView('emails/practitioner_sme_issues_email_mjml', {
        ...this.data,
        practitionerName: data?.practitionerName,
        reviewerName: data?.reviewerName,
        noteId: data?.noteId,
        versionId: data?.versionId,
        clientId: data?.clientId ?? '',
        smeIssues: data?.smeIssues,
        intakeqFormNoteUrlBase: appConfig.intakeqFormNoteUrlBase,
      })
  }
}
