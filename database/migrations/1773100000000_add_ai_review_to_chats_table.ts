import { ChatAiReviewEnum } from '#enums/chat_enum'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'chats'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('ai_review', Object.values(ChatAiReviewEnum))
        .notNullable()
        .defaultTo(ChatAiReviewEnum.bedrock)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ai_review')
    })
  }
}
