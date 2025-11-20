export interface WelcomeEmailDispatchEvent {
  userEmail: string
}

export interface WelcomeEmailSendEvent {
  event: {
    userEmail: string
    to: string
  }
}
