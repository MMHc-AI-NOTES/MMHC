import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Patient from '#models/patient'

export default class extends BaseSeeder {
  async run() {
    // Mapping of patient_id to client_id based on note_id mapping
    const patientIdToClientIdMap: Record<number, string> = {
      1: '6596', // noteId: '4b2e90f4-23e7-42fa-b106-cd0b9854701c'
      2: '0001', // Hardcoded
      3: '0002', // Hardcoded
      4: '8428', // noteId: '73824299-a7aa-4313-af0e-693c1b9f6714'
      5: '8466', // noteId: '9397b533-81c0-481e-b49c-909dae7fcadd'
      6: '8501', // noteId: '817ac79e-c818-41b9-bcea-54aab75042e5'
      7: '8242', // noteId: '6a3e4239-bd1a-4f0a-8e4a-7c8e88f4f21f'
      8: '7192', // noteId: '6867b209-bb73-4608-8880-1e045e117d36'
      9: '1572', // noteId: '34914133-3c6c-4f04-a275-e0fde9317e00'
      10: '8301', // noteId: 'cf799158-fc0c-4ffb-aaab-a0c8dd2484f9'
      11: '8674', // noteId: '95139808-e0cb-41ea-8db1-265c4d6098e4'
      12: '1989', // noteId: 'b9521ac5-9919-4baa-8a1c-7100a97511f5'
      13: '1925', // noteId: 'cc9c3442-f17c-4b84-8391-c165ca8df880'
      14: '6690', // noteId: '505f2079-107c-4ce0-aa3e-95e88621c460'
      15: '6312', // noteId: '41252364-7674-4f54-adec-2a23991b4394'
      16: '1194', // noteId: 'f19e007b-fe0e-49bd-b79f-8f911de2e1a3'
      17: '6596', // noteId: '4b2e90f4-23e7-42fa-b106-cd0b9854701d'
      18: '6400', // noteId: '491c2bcf-635d-41f4-a33f-dacf717955ce'
      19: '6294', // noteId: 'd7be4b6a-cc29-46c6-accf-3107520ef084'
    }

    for (let i = 1; i <= 19; i++) {
      const clientId = patientIdToClientIdMap[i] || null

      await Patient.updateOrCreate(
        { id: i },
        {
          id: i,
          clientId: clientId,
        }
      )
    }
  }
}
