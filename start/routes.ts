/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import env from '#start/env'

const envKeys = [
  'NODE_ENV',
  'PORT',
  'APP_KEY',
  'HOST',
  'LOG_LEVEL',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_DATABASE',
  'SMTP_HOST',
  'SMTP_PORT',

  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'AWS_REGION',
  'AWS_ACCESS',

  // add the remaining keys here
] as const

console.log(Object.fromEntries(envKeys.map((key) => [key, env.get(key)])))

import router from '@adonisjs/core/services/router'
import '#start/routes/user_routes'
import '#start/routes/auth_routes'
import '#start/routes/email_routes'
import '#start/routes/note_routes'
import '#start/routes/agent_routes'
import '#start/routes/chat_routes'
import '#start/routes/mcp_chat_routes'
import '#start/routes/session_review_routes'
import '#start/routes/mcp_session_review_routes'
import '#start/routes/patient_routes'
import '#start/routes/practitioner_routes'
import '#start/routes/human_review_routes'
import '#start/routes/manager_review_routes'
import '#start/routes/cpt_code_routes'
import '#start/routes/webhook_routes'
import '#start/routes/sme_issue_routes'
import '#start/routes/error_type_routes'
import '#start/routes/issues_related_to_routes'
import '#start/routes/issue_description_routes'
import '#start/routes/sme_issue_template_routes'
import '#start/routes/morf_routes'
import '#start/routes/feedback_routes'

import '#start/routes/note_review_mark_routes'
import { sendSuccess } from '#services/custom_response_service'

router.get('/', async () => {
  return sendSuccess('Server is running')
})
