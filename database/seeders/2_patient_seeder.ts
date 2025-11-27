import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Patient from '#models/patient'

export default class extends BaseSeeder {
  async run() {
    await Patient.updateOrCreate(
      { id: 1 },
      {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440001',
      }
    )

    await Patient.updateOrCreate(
      { id: 2 },
      {
        id: 2,
        uuid: '550e8400-e29b-41d4-a716-446655440002',
      }
    )

    await Patient.updateOrCreate(
      { id: 3 },
      {
        id: 3,
        uuid: '550e8400-e29b-41d4-a716-446655440003',
      }
    )
  }
}
