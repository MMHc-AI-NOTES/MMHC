import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { createMcpChat } from '#services/mcp_chat_service'

const DEFAULT_CHUNK_SIZE = 25
const DEFAULT_DELAY_MS = 2000

export default class ReviewAllSessionNotesMcp extends BaseCommand {
  static commandName = 'session:review-all-notes-mcp'
  static description = 'Run MCP AI note review for sessions that do not have a chat'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Number of sessions fetched per chunk (default: 25)' })
  declare chunkSize?: number

  @flags.number({ description: 'User ID used for the created chat/audit records' })
  declare userId?: number

  @flags.number({ description: 'Delay between chunks in milliseconds (default: 1000)' })
  declare delay?: number

  async run() {
    const chunkSize = this.chunkSize ?? DEFAULT_CHUNK_SIZE
    const delay = this.delay ?? DEFAULT_DELAY_MS

    if (!Number.isInteger(chunkSize) || chunkSize < 1) {
      this.logger.error('--chunk-size must be a positive integer')
      return
    }

    if (!Number.isInteger(delay) || delay < 0) {
      this.logger.error('--delay must be a non-negative integer')
      return
    }

    const userId = this.userId ?? 1 //1 is for admin user

    let lastId = 0
    let processed = 0
    let skipped = 0
    let failed = 0

    this.logger.info(`Starting MCP review in chunks of ${chunkSize} using user ${userId}`)

    while (true) {
      const sessions = await db
        .from('session')
        .whereNull('deleted_at')
        .where('id', '>', lastId)
        .orderBy('id', 'asc')
        .limit(chunkSize)
        .select('id', 'note_id')

      if (sessions.length === 0) break

      for (const session of sessions) {
        lastId = session.id

        const existingChat = await db
          .from('chats')
          .where('note_id', session.note_id)
          .select('id')
          .first()

        if (existingChat) {
          skipped++
          continue
        }

        try {
          await createMcpChat({ note_id: session.note_id }, userId)
          processed++
          this.logger.info(`Reviewed ${session.note_id} (${processed} created)`)
        } catch (error: any) {
          failed++
          this.logger.error(`Failed ${session.note_id}: ${error?.message ?? String(error)}`)
        }
      }

      this.logger.info(
        `Chunk complete through session ${lastId}; created=${processed}, skipped=${skipped}, failed=${failed}`
      )

      if (sessions.length === chunkSize && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    this.logger.success(`Finished: created=${processed}, skipped=${skipped}, failed=${failed}`)
  }
}
