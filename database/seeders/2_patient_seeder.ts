import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Patient from '#models/patient'

export default class extends BaseSeeder {
  async run() {
    const patients = []
    for (let i = 1; i <= 19; i++) {
      const paddedId = i.toString().padStart(3, '0')
      patients.push({
        id: i,
        uuid: `550e8400-e29b-41d4-a716-446655440${paddedId}`,
      })
    }

    for (const patient of patients) {
      await Patient.updateOrCreate({ id: patient.id }, patient)
    }
  }
}
