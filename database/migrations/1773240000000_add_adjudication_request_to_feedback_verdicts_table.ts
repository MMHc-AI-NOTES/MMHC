import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'feedback_verdicts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('adjudication_request').nullable().after('comment')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('adjudication_request')
    })
  }
}
