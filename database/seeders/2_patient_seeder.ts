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
      15: '6312', // noteId: '41252364-7674-4f54-adec-2a23991b4394','c669368c-4ae5-42f0-84ad-8496302f54e4'
      16: '1194', // noteId: 'f19e007b-fe0e-49bd-b79f-8f911de2e1a3'
      17: '6596', // noteId: '4b2e90f4-23e7-42fa-b106-cd0b9854701d'
      18: '6400', // noteId: '491c2bcf-635d-41f4-a33f-dacf717955ce'
      19: '6294', // noteId: 'd7be4b6a-cc29-46c6-accf-3107520ef084'
      // New patients from user mapping (in reverse order)
      20: '9327', // noteId: 'e6d7da1f-61b9-4309-9f8e-b0d41eb9f2d5'
      21: '6782', // noteId: '4fb2212d-7c21-46f3-98f2-ee9d65de749d'
      22: '8142', // noteId: 'c9f85d9e-7aaf-4b58-ae0e-9e0c2b1bf3ad'
      23: '9937', // noteId: '2d90f451-afa1-40d4-b495-9f3270a734c1'
      24: '8638', // noteId: '9ef8ee08-8975-4d13-a946-2ffb1f758aad'
      25: '1720', // noteId: 'aa1f8713-7a21-4901-9b9e-4409ab51a01b'
      26: '8630', // noteId: 'b2a2fc73-ce40-4d36-9a84-1e6103db86d8'
      27: '1157', // noteId: '36558694-4169-47a0-912d-8ca5392623c5'
      28: '6537', // noteId: 'fad4f516-de3e-4c6d-8aaa-a28b2266efeb'
      29: '6964', // noteId: 'b1c146a8-15e4-41a2-afd4-4756a380cd4e'
      30: '8365', // noteId: 'f8332ac1-0161-437d-bfeb-ba7e952a1cf3'
      31: '1753', // noteId: 'e97adcf1-2327-4f95-8b3f-801bef85bdc7'
      32: '7382', // noteId: '0222480d-83e7-4c96-9e99-73f78b70e6c7'
      33: '6997', // noteId: 'e7c3b848-83e0-4aca-bc82-7ee5a843e851'
      34: '7331', // noteId: 'e4c03ead-daba-4540-aaf3-addea3a3b444'
      35: '6693', // noteId: 'b6e04e8f-0afc-4e32-897a-d07449783f79'
      36: '8177', // noteId: '02f3230e-6526-46cc-b06b-57f81da105c3'
      37: '7016', // noteId: '3828ccd0-2424-4ea4-bdfb-abb4da59b405' and '3dce6595-1ea9-485f-9713-cc467384318e'
    }

    for (let i = 1; i <= 37; i++) {
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
