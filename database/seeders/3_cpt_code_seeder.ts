import { BaseSeeder } from '@adonisjs/lucid/seeders'
import CptCode from '#models/cpt_code'

export default class extends BaseSeeder {
  async run() {
    const cptCodes = [
      {
        name: '(Couples) Initial Consultation: Assessment/Treatment Plan',
        code: '90791',
        appointmentTypeId: 'bd397210-5287-4911-b95c-998ec833180d',
      },
      {
        name: 'Brief Psychotherapy 16-25 min (Patient and/or Support)',
        code: '90832',
        appointmentTypeId: '3eabc27c-cc63-476d-b8e7-efe93e447019',
      },
      {
        name: 'Crisis Therapy - Extended (30 min)',
        code: '90840',
        appointmentTypeId: 'ceaabaa5-cd2f-4c74-ab39-bbf58565e4da',
      },
      {
        name: 'EMDR 53 min',
        code: '90837',
        appointmentTypeId: '2dba4538-e132-4972-89b4-053820d121b0',
      },
      {
        name: 'Family psychotherapy (conjoint psychotherapy) (with patient present), 50 minutes',
        code: '90847',
        appointmentTypeId: '6b06212f-41b8-4b76-886f-df9904b4ce1b',
      },
      {
        name: 'Family psychotherapy (without the patient present), 50 minutes',
        code: '90846',
        appointmentTypeId: '8ecf938c-9131-43d5-8efa-ce37c213129c',
      },
      {
        name: 'Group Therapy',
        code: '90853',
        appointmentTypeId: '7b247ec6-02dc-4a4f-b015-c3b0b8afc553',
      },
      {
        name: 'Initial Consultation: Assessment/Treatment Plan',
        code: '90791',
        appointmentTypeId: '4309c9b4-84a4-4a16-bd4a-a57a5f424be2',
      },
      {
        name: 'Initial Consultation: Couples',
        code: '90791',
        appointmentTypeId: '01d17cef-1714-4cf2-93e5-5b5388230c8b',
      },
      {
        name: 'Initial Consultation: Intake/Assessment',
        code: '90791',
        appointmentTypeId: '13501ab7-6e31-4f0d-a15c-a09c07cfe006',
      },
      {
        name: 'Initial Consultation: Intake/Assessment (MOLINA Only)',
        code: '90837',
        appointmentTypeId: '6e084fbf-fbbd-41eb-997d-656992d06e5f',
      },
      {
        name: 'Psychotherapy for crisis; first 60 minutes',
        code: '90839',
        appointmentTypeId: '15c74de7-adf7-45d9-b337-da7cd8d2c3ed',
      },
      {
        name: 'Psychotherapy, 16-37 minutes',
        code: '90832',
        appointmentTypeId: '8e636dd6-299a-4ac9-9dc4-bec0563dee3f',
      },
      {
        name: 'Psychotherapy, 38-52 minutes',
        code: '90834',
        appointmentTypeId: 'fefbc4f4-bf79-4caf-a5c7-bfb287606784',
      },
      {
        name: 'Psychotherapy, 53-60 minutes',
        code: '90837',
        appointmentTypeId: 'a7cda0b6-9295-4bd8-9e06-67867cc9d8cb',
      },
    ]

    for (const cptCode of cptCodes) {
      await CptCode.updateOrCreate(
        { appointmentTypeId: cptCode.appointmentTypeId },
        {
          code: cptCode.code,
          appointmentTypeId: cptCode.appointmentTypeId,
          name: cptCode.name,
          description: cptCode.name,
        }
      )
    }
  }
}
