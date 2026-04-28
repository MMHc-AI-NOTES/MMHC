import { BaseMail } from '@adonisjs/mail'
import { EmailInterface } from '#interfaces/email_base_interface'
import { emailConfig } from '#config/services'
import edge from 'edge.js'
import { emailCompanyLogo } from '#config/services'

export default class UserInviteEmail extends BaseMail {
  from = ''
  subject = ''
  data: EmailInterface

  constructor(data: EmailInterface) {
    super()
    this.data = data
    this.from = emailConfig.from
    this.subject = this.data.subject || 'You have been invited to MMHF'
  }

  prepare() {
    edge.global('companyLogo', emailCompanyLogo)
    const { bcc, cc, data ,to} = this.data


    this.message
      .to(to)
      .bcc(bcc || [])
      .cc(cc || [])
      .htmlView('emails/user_invite_email_mjml', {
        ...this.data,
        invitationLink: data?.invitationLink,
      })
  }
}
