/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  SMTP_HOST: Env.schema.string({ format: 'host' }),
  SMTP_PORT: Env.schema.string(),
  SMTP_USERNAME: Env.schema.string(),
  SMTP_PASSWORD: Env.schema.string(),
  SMTP_FROM: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring AWS Bedrock
  |----------------------------------------------------------
  */
  AWS_REGION: Env.schema.string.optional(),
  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  BEDROCK_MAX_TOKENS: Env.schema.number.optional(),
  BEDROCK_ANTHROPIC_VERSION: Env.schema.string.optional(),
  AI_REVIEW: Env.schema.enum.optional(['BEDROCK', 'MCP'] as const),
  MCP_API_URL: Env.schema.string(),
  MCP_TOKEN: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring S3 dataset uploads
  |----------------------------------------------------------
  */
  S3_DATA_BUCKET: Env.schema.string.optional(),
  S3_DATA_PREFIX: Env.schema.string.optional(),
  S3_DATA_BASE_PATH: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Redis (BullMQ)
  |----------------------------------------------------------
  */
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number.optional(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  REDIS_DB: Env.schema.number.optional(),
  REDIS_PREFIX: Env.schema.string.optional(),
  REDIS_KEY_PREFIX: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | PracticeQ Configuration
  |----------------------------------------------------------
  */
  PRACTICEQ_API_KEY: Env.schema.string.optional(),
  PRACTICEQ_BASE_URL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Google BigQuery Configuration
  |----------------------------------------------------------
  */
  BIGQUERY_PROJECT_ID: Env.schema.string.optional(),
  BIGQUERY_CLIENT_EMAIL: Env.schema.string.optional(),
  BIGQUERY_PRIVATE_KEY: Env.schema.string.optional(),
  BIGQUERY_NOTES_TABLE: Env.schema.string.optional(),
  BIGQUERY_APPOINTMENT_TABLE: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | SageMaker Configuration
  |----------------------------------------------------------
  */
  SAGEMAKER_INFERENCE_COMPONENT_NAME: Env.schema.string.optional(),
  SAGEMAKER_INFERENCE_COMPONENT_MAP: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | General Application Variables
  |----------------------------------------------------------
  */
  TZ: Env.schema.string.optional(),
  APP_NAME: Env.schema.string.optional(),
  FRONTEND_URL: Env.schema.string.optional(),
  EMAIL_COMPANY_LOGO: Env.schema.string.optional(),
  EMAIL_TEST: Env.schema.boolean.optional(),
  EMAIL_TEST_ADDRESS: Env.schema.string.optional(),
  INTAKEQ_FORM_NOTE_URL_BASE: Env.schema.string.optional(),
})
