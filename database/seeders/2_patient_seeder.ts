import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Patient from '#models/patient'

export default class extends BaseSeeder {
  async run() {
    await Patient.updateOrCreate(
      { uuid: '550e8400-e29b-41d4-a716-446655440001' },
      {
        uuid: '550e8400-e29b-41d4-a716-446655440001',
      }
    )

    await Patient.updateOrCreate(
      { uuid: '550e8400-e29b-41d4-a716-446655440002' },
      {
        uuid: '550e8400-e29b-41d4-a716-446655440002',
      }
    )

    await Patient.updateOrCreate(
      { uuid: '550e8400-e29b-41d4-a716-446655440003' },
      {
        uuid: '550e8400-e29b-41d4-a716-446655440003',
      }
    )
  }
}
