import env from '#start/env'

export const emailCompanyLogo = env.get(
  'EMAIL_COMPANY_LOGO',
  'https://mmh-dev.theexpertscloud.com/assets/logo-with-text-CKWOTRJC.svg'
)

const parseTestEmails = (value: string | undefined): string[] => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

const isEmailTestEnabled = String(env.get('EMAIL_TEST', 'false')).toLowerCase() === 'true'
const testEmailAddresses = parseTestEmails(env.get('EMAIL_TEST_ADDRESS'))

export const emailConfig = {
  from: env.get('SMTP_FROM', 'noreply@example.com'),
  isTest: isEmailTestEnabled,
  testAddresses: testEmailAddresses,
}

export const bedrockConfig = {
  maxTokens: env.get('BEDROCK_MAX_TOKENS', 4096),
  region: env.get('AWS_REGION', 'us-east-1'),
  accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
  secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY', ''),
  anthropicVersion: env.get('BEDROCK_ANTHROPIC_VERSION', 'bedrock-2023-05-31'),
}

export const smtpConfig = {
  host: env.get('SMTP_HOST', ''),
  port: env.get('SMTP_PORT', '587'),
  username: env.get('SMTP_USERNAME', ''),
  password: env.get('SMTP_PASSWORD', ''),
  from: env.get('SMTP_FROM', 'noreply@example.com'),
}

export const practiceQConfig = {
  apiKey: env.get('PRACTICEQ_API_KEY', ''),
  baseUrl: env.get('PRACTICEQ_BASE_URL', 'https://intakeq.com/api/v1'),
}

export const redisConfig = {
  host: env.get('REDIS_HOST', '127.0.0.1'),
  port: Number(env.get('REDIS_PORT', '6379')),
  password: env.get('REDIS_PASSWORD', '') || undefined,
  db: Number(env.get('REDIS_DB', '0')),
  keyPrefix: env.get('REDIS_KEY_PREFIX', 'mmh-'),
}

export const appConfig = {
  frontendUrl: String(env.get('FRONTEND_URL', 'http://localhost:3000')).replace(/\/+$/, ''),
}
