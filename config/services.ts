import env from '#start/env'

export const emailCompanyLogo =
  'https://mmh-dev.theexpertscloud.com/assets/logo-with-text-CKWOTRJC.svg'

export const emailConfig = {
  from: env.get('SMTP_FROM', 'noreply@example.com'),
}

export const bedrockConfig = {
  maxTokens: env.get('BEDROCK_MAX_TOKENS', 4096),
  region: env.get('AWS_REGION', 'us-east-1'),
  accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
  secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY', ''),
  anthropicVersion: env.get('BEDROCK_ANTHROPIC_VERSION', 'bedrock-2023-05-31'),
}
