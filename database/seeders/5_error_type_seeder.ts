import { BaseSeeder } from '@adonisjs/lucid/seeders'
import ErrorType from '#models/error_type'
import logger from '@adonisjs/core/services/logger'

export default class extends BaseSeeder {
  async run() {
    try {
      const errorTypesData = [
        {
          id: 1,
          name: 'minor',
          display_name: 'Minor (-5 pts)',
          points: 5,
        },
        {
          id: 2,
          name: 'moderate',
          display_name: 'Moderate (-15 pts)',
          points: 15,
        },
        {
          id: 3,
          name: 'critical',
          display_name: 'Critical (-25 pts)',
          points: 25,
        },
      ]

      await ErrorType.updateOrCreateMany('id', errorTypesData)
    } catch (error) {
      logger.error(`Error in seeding error types: ${error}`)
      throw error
    }
  }
}
