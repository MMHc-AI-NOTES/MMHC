import { BaseSchema } from '@adonisjs/lucid/schema'
import User from '#models/user'
import { UserTypeEnum } from '#enums/user_type_enum'

export default class extends BaseSchema {
  protected tableName = User.table

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').notNullable()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.integer('type').nullable().defaultTo(UserTypeEnum.user)
      table.boolean('is_active').defaultTo(true)

      table.timestamp('created_at').defaultTo(this.raw('CURRENT_TIMESTAMP'))
      table
        .timestamp('updated_at')
        .defaultTo(this.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
      table.timestamp('deleted_at').nullable().defaultTo(null)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
