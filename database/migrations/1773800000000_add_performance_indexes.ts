import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('audit_logs', (table) => {
      table.index(['note_id', 'action'], 'idx_audit_logs_note_action')
    })

    this.schema.alterTable('session', (table) => {
      table.index(['session_time', 'id'], 'idx_session_time_id')
      table.index(['practitioner_id', 'session_time'], 'idx_session_practitioner_time')
      table.index(['type', 'session_time'], 'idx_session_type_time')
    })
  }

  async down() {
    this.schema.alterTable('audit_logs', (table) => {
      table.dropIndex(['note_id', 'action'], 'idx_audit_logs_note_action')
    })

    this.schema.alterTable('session', (table) => {
      table.dropIndex(['session_time', 'id'], 'idx_session_time_id')
      table.dropIndex(['practitioner_id', 'session_time'], 'idx_session_practitioner_time')
      table.dropIndex(['type', 'session_time'], 'idx_session_type_time')
    })
  }
}
