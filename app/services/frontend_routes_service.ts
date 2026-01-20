import env from '#start/env'

export const frontendRoutesConfig = {
  userOnboardingLink: `FRONTEND_BASE_URL/onboarding?token=TOKEN`,
  // userEmailVerificationLink: `FRONTEND_BASE_URL/verify/TOKEN`,
  // passwordResetLink: `FRONTEND_BASE_URL/reset-password?token=TOKEN`,
}

const getFrontendBaseUrl = () => {
  return env.get('FRONTEND_URL', 'https://mmh-dev.theexpertscloud.com/create-invited-user')
}

export const getFrontendLink = (routeTemplate: string, token: string): string => {
  const baseUrl = getFrontendBaseUrl()
  let link = routeTemplate.replace('FRONTEND_BASE_URL', baseUrl)
  link = link.replace('TOKEN', token)
  return link
}
