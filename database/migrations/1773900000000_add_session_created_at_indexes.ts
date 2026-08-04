import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('session', (table) => {
      table.index(['created_at'], 'idx_session_created_at')
      table.index(['practitioner_id', 'created_at'], 'idx_session_practitioner_created_at')
    })
  }

  async down() {
    this.schema.alterTable('session', (table) => {
      table.dropIndex(['created_at'], 'idx_session_created_at')
      table.dropIndex(['practitioner_id', 'created_at'], 'idx_session_practitioner_created_at')
    })
  }
}
