import { BaseMail } from '@adonisjs/mail'
import { EmailInterface } from '#interfaces/email_base_interface'
import { emailConfig } from '#config/services'
import edge from 'edge.js'
import { emailCompanyLogo } from '#config/services'

export interface MissingFieldsEmailData {
  practitionerName: string
  missingFields?: string[]
  noteId?: string
}

export default class MissingFieldsEmail extends BaseMail {
  from = ''
  subject = ''
  data: EmailInterface & { data: MissingFieldsEmailData }

  constructor(data: EmailInterface & { data: MissingFieldsEmailData }) {
    super()
    this.data = data
    this.from = emailConfig.from
    this.subject = this.data.subject || 'Session Fields Missing - Action Required'
  }

  prepare() {
    edge.global('companyLogo', emailCompanyLogo)
    const { bcc, cc } = this.data

    const to = emailConfig.isTest ? emailConfig.testAddresses.join(',') : this.data.to

    this.message
      .to(to)
      .bcc(bcc || [])
      .cc(cc || [])
      .htmlView('emails/missing_fields_notification', {
        practitionerName: this.data.data.practitionerName,
        missingFields: this.data.data.missingFields || [],
        noteId: this.data.data.noteId,
      })
  }
}
