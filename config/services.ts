import env from '#start/env'

export const emailCompanyLogo = 'https://cdn.getvero.com/dd-editor/templates/top-news/brand.png'

export const emailConfig = {
  from: env.get('SMTP_FROM', 'noreply@example.com'),
}
