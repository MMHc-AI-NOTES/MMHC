export interface EmailInterface {
  to: string
  bcc?: string[]
  cc?: string[]
  subject: string
  data?: Record<string, any>
}
