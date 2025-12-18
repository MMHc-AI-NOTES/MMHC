import env from '#start/env'

export const emailCompanyLogo = 'https://cdn.getvero.com/dd-editor/templates/top-news/brand.png'

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

export const practiceQConfig = {
  apiKey: env.get('PRACTICEQ_API_KEY', ''),
  baseUrl: env.get('PRACTICEQ_BASE_URL', 'https://intakeq.com/api/v1'),
}

export const redisConfig = {
  host: env.get('REDIS_HOST', '127.0.0.1'),
  port: env.get('REDIS_PORT', 6379),
  password: env.get('REDIS_PASSWORD', ''),
}
