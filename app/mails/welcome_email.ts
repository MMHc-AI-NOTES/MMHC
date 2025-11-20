import { BaseMail } from '@adonisjs/mail'
import { EmailInterface } from '#interfaces/email_base_interface'
import { emailConfig } from '#config/services'
import edge from 'edge.js'
import { emailCompanyLogo } from '#config/services'

export default class WelcomeEmail extends BaseMail {
  from = ''
  subject = ''
  data: EmailInterface

  constructor(data: EmailInterface) {
    super()
    this.data = data
    this.from = emailConfig.from
    this.subject = this.data.subject
  }

  prepare() {
    edge.global('companyLogo', emailCompanyLogo)
    const { to, bcc, cc } = this.data

    this.message
      .to(to)
      .bcc(bcc || [])
      .cc(cc || [])
      .htmlView('emails/welcome_email_mjml', this.data)
  }
}
