import { BaseSchema } from '@adonisjs/lucid/schema'
import {
  SessionTypeEnum,
  AiStatusEnum,
  HumanReviewEnum,
  ManagerEnum,
  WorkflowEnum,
  PriorityEnum,
} from '#enums/session_enum'

export default class extends BaseSchema {
  protected tableName = 'session_table'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('type').nullable().defaultTo(SessionTypeEnum.progress_note)
      table.float('ai_score').nullable()
      table.integer('ai_status').nullable().defaultTo(AiStatusEnum.not_reviewed)
      table.integer('human_review').nullable().defaultTo(HumanReviewEnum.pending)
      table.integer('manager').nullable().defaultTo(ManagerEnum.not_needed)
      table.integer('workflow').nullable().defaultTo(WorkflowEnum.in_queue)
      table.integer('priority').nullable().defaultTo(PriorityEnum.low)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type')
      table.dropColumn('ai_score')
      table.dropColumn('ai_status')
      table.dropColumn('human_review')
      table.dropColumn('manager')
      table.dropColumn('workflow')
      table.dropColumn('priority')
    })
  }
}
