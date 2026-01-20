import { BaseSchema } from '@adonisjs/lucid/schema'
import User from '#models/user'

export default class extends BaseSchema {
  protected tableName = User.table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('has_completed_onboarding').defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('has_completed_onboarding')
    })
  }
}
