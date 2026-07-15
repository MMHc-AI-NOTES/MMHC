import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { createMcpChat } from '#services/mcp_chat_service'

const DEFAULT_CHUNK_SIZE = 200
const DEFAULT_DELAY_MS = 1
const DEFAULT_CONCURRENCY = 200

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

  @flags.number({ description: 'Maximum number of MCP reviews running concurrently (default: 5)' })
  declare concurrency?: number

  async run() {
    const chunkSize = this.chunkSize ?? DEFAULT_CHUNK_SIZE
    const delay = this.delay ?? DEFAULT_DELAY_MS
    const concurrency = this.concurrency ?? DEFAULT_CONCURRENCY

    if (!Number.isInteger(chunkSize) || chunkSize < 1) {
      this.logger.error('--chunk-size must be a positive integer')
      return
    }

    if (!Number.isInteger(delay) || delay < 0) {
      this.logger.error('--delay must be a non-negative integer')
      return
    }

    if (!Number.isInteger(concurrency) || concurrency < 1) {
      this.logger.error('--concurrency must be a positive integer')
      return
    }

    const userId = this.userId ?? 1 //1 is for admin user

    let lastId = 0
    let processed = 0
    let skipped = 0
    let failed = 0

    this.logger.info(
      `Starting MCP review in chunks of ${chunkSize}, concurrency ${concurrency} using user ${userId}`
    )

    while (true) {
      const sessions = await db
        .from('session')
        .whereNull('deleted_at')
        .where('id', '>', lastId)
        .orderBy('id', 'asc')
        .limit(chunkSize)
        .select('id', 'note_id')

      if (sessions.length === 0) break

      lastId = sessions[sessions.length - 1].id

      const noteIds = sessions.map((session) => session.note_id)
      const existingChats = await db.from('chats').whereIn('note_id', noteIds).select('note_id')

      const existingNoteIds = new Set(existingChats.map((chat) => chat.note_id))
      const pendingSessions = sessions.filter((session) => !existingNoteIds.has(session.note_id))
      skipped += sessions.length - pendingSessions.length

      await this.mapWithConcurrency(pendingSessions, concurrency, async (session) => {
        try {
          await createMcpChat({ note_id: session.note_id }, userId)
          processed++
          this.logger.info(`Reviewed ${session.note_id} (${processed} created)`)
        } catch (error: any) {
          failed++
          this.logger.error(`Failed ${session.note_id}: ${error?.message ?? String(error)}`)
        }
      })

      this.logger.info(
        `Chunk complete through session ${lastId}; created=${processed}, skipped=${skipped}, failed=${failed}`
      )

      if (sessions.length === chunkSize && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    this.logger.success(`Finished: created=${processed}, skipped=${skipped}, failed=${failed}`)
  }

  private async mapWithConcurrency<T>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<void>
  ): Promise<void> {
    let nextIndex = 0

    const worker = async () => {
      while (true) {
        const index = nextIndex++
        if (index >= items.length) return
        await mapper(items[index])
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  }
}
