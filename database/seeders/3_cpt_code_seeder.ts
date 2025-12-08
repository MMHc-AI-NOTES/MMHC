import { BaseSeeder } from '@adonisjs/lucid/seeders'
import CptCode from '#models/cpt_code'

export default class extends BaseSeeder {
  async run() {
    const cptCodes = [
      {
        code: '90791',
        name: 'Psychiatric Diagnostic Evaluation',
        description:
          'Psychiatric diagnostic evaluation - Comprehensive diagnostic evaluation including history, mental status, and formulation',
      },
      {
        code: '90834',
        name: 'Psychotherapy, 45 Minutes',
        description: 'Psychotherapy, 45 minutes with patient',
      },
      {
        code: '90837',
        name: 'Psychotherapy, 60 Minutes',
        description: 'Psychotherapy, 60 minutes with patient',
      },
      {
        code: '90853',
        name: 'Group Psychotherapy',
        description: 'Group psychotherapy',
      },
      {
        code: '96372',
        name: 'Therapeutic, Prophylactic, or Diagnostic Injection',
        description:
          'Therapeutic, prophylactic, or diagnostic injection (specify substance or drug); subcutaneous or intramuscular',
      },
      {
        code: '99214',
        name: 'Office Visit for Established Patient, Moderate Complexity',
        description:
          'Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and moderate level of medical decision making',
      },
    ]

    for (const cptCode of cptCodes) {
      await CptCode.updateOrCreate({ code: cptCode.code }, cptCode)
    }
  }
}
