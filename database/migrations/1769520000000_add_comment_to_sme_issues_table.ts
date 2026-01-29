import { BaseSchema } from '@adonisjs/lucid/schema'
import SmeIssue from '#models/sme_issue'

export default class extends BaseSchema {
  protected tableName = SmeIssue.table

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('comment').nullable().after('status')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('comment')
    })
  }
}
