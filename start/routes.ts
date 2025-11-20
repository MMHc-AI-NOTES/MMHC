/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import '#start/routes/user_routes'
import '#start/routes/auth_routes'
import '#start/routes/email_routes'

import { sendSuccess } from '#services/custom_response_service'

router.get('/', async () => {
  return sendSuccess('Server is running')
})
