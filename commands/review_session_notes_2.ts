import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { invokeSessionReview } from '#services/session_review_service'
import fs from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3DatasetConfig } from '#config/services'

interface Issue {
  error_type: string
  section: string
  description: string
}

interface ReviewOutput {
  client_id: string | null
  current_session_note_id: string
  previous_session_note_id: string | null
  current_session: string
  previous_session: string | null
  sme_issues: Issue[]
  ai_issues: Issue[]
}

export default class ReviewSessionNotes extends BaseCommand {
  static commandName = 'session:review-notes-2'

  static description = 'Review session notes from database via AI - supports range-based indexing'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Start ID (inclusive, default: 0)' })
  declare from?: number

  @flags.number({ description: 'End ID (inclusive, default: 60)' })
  declare to?: number

  @flags.string({ description: 'Output file (default: session_review_output.json)' })
  declare output?: string

  async run() {
    try {
      const from = this.from || 0
      const to = this.to || 60
      const now = new Date()
      const date = now.toISOString().slice(0, 10)
      const epoch = Math.floor(now.getTime() / 1000)
      const outputFile = this.output || `AIReview-2-${date}-${epoch}.json`

      if (from > to) {
        this.logger.error(
          `Invalid range: --from (${from}) must be less than or equal to --to (${to})`
        )
        return
      }

      const [agentResult] = await db.from('agents').where('is_default', true).select('id', 'model')
      if (!agentResult?.id) {
        this.logger.error('No default agent found')
        return
      }

      this.logger.info(`Range: ID BETWEEN ${from} AND ${to}`)

      const notesToReview = await db
        .from('session as s')
        .leftJoin('patients as p', 's.patient_id', 'p.id')
        .whereNull('s.deleted_at')
        .whereBetween('s.id', [from, to])
        .select(
          's.note_id',
          's.session',
          's.session_time',
          's.patient_id',
          's.parent_note_id',
          'p.client_id'
        )

      this.logger.info(`Fetched ${notesToReview.length} notes`)

      const concurrency = 100
      this.logger.info(`Reviewing up to ${concurrency} notes in parallel`)

      const reviewResults = await this.mapWithConcurrency(
        notesToReview,
        concurrency,
        async (note, index): Promise<ReviewOutput | null> => {
          try {
            const smeIssues = await this.fetchSmeIssues(note.note_id)

            this.logger.info(
              `[${index + 1}/${notesToReview.length}] ${note.note_id} (${smeIssues.length} SME issues)`
            )

            let previousSession: string | null = null
            let previousNoteId: string | null = null
            if (note.parent_note_id) {
              const parent = await db
                .from('session')
                .where('id', note.parent_note_id)
                .whereNull('deleted_at')
                .select('note_id', 'session')
                .first()

              if (parent) {
                previousNoteId = parent.note_id
                previousSession = parent.session
              }
            }

            const aiReview = await invokeSessionReview({
              note_id: note.note_id,
              prompt_id: agentResult.id,
              model_id: agentResult.model,
              temperature: 0.1,
              top_p: 0.9,
              top_k: 40,
            })

            const aiIssues = this.extractAiIssues(aiReview)

            this.logger.info(`  Done ${note.note_id} (${aiIssues.length} AI issues)`)

            return {
              client_id: note.client_id || null,
              current_session_note_id: note.note_id,
              previous_session_note_id: previousNoteId,
              current_session: note.session,
              previous_session: previousSession,
              sme_issues: smeIssues,
              ai_issues: aiIssues,
            }
          } catch (error: any) {
            this.logger.error(`  Failed ${note.note_id}: ${error.message}`)
            return null
          }
        }
      )

      const results = reviewResults.filter((result): result is ReviewOutput => result !== null)
      const reviewed = results.length

      const filePath = app.makePath(outputFile)
      await fs.writeFile(filePath, JSON.stringify(results, null, 2))

      this.logger.info('')
      this.logger.info(`Reviewed: ${reviewed}`)
      this.logger.info(`Output: ${filePath}`)

      // Upload to S3
      try {
        const bucket = s3DatasetConfig.bucket
        const basePath = s3DatasetConfig.basePath || ''
        const normalizedBasePath = basePath.replace(/^\/+/, '').replace(/\/+$/, '')
        const client = new S3Client({
          region: s3DatasetConfig.region,
        })

        const fileBody = await fs.readFile(filePath)
        const s3Key = `${normalizedBasePath}/${outputFile}`

        this.logger.info(`Uploading to s3://${bucket}/${s3Key} ...`)
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: fileBody,
            ContentType: 'application/json',
          })
        )

        this.logger.success(`Upload successful: s3://${bucket}/${s3Key}`)

        // Remove local file after successful upload
        await fs.unlink(filePath)
        this.logger.info(`Removed local file: ${filePath}`)
      } catch (s3Error: any) {
        this.logger.error(`S3 upload failed: ${s3Error?.message || String(s3Error)}`)
      }
    } catch (error: any) {
      this.logger.error(`Fatal: ${error.message}`)
    }
  }

  private async fetchSmeIssues(noteId: string): Promise<Issue[]> {
    const rows = await db
      .from('sme_issues')
      .where('note_id', noteId)
      .whereNull('sme_issues.deleted_at')
      .leftJoin('issues_related_to', 'sme_issues.issues_related_to_id', 'issues_related_to.id')
      .leftJoin('issue_descriptions', 'sme_issues.issue_description_id', 'issue_descriptions.id')
      .leftJoin('error_types', 'sme_issues.error_type_id', 'error_types.id')
      .select(
        'error_types.name as error_type',
        'issues_related_to.display_name as section',
        'issue_descriptions.description'
      )

    return rows.map((row) => ({
      error_type: row.error_type || 'unknown',
      section: row.section || 'unknown',
      description: row.description || 'unknown',
    }))
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results = new Array<R>(items.length)
    let nextIndex = 0
    const workerCount = Math.min(concurrency, items.length)

    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextIndex++
        if (currentIndex >= items.length) return

        results[currentIndex] = await mapper(items[currentIndex], currentIndex)
      }
    })

    await Promise.all(workers)

    return results
  }

  private extractAiIssues(aiReview: any): Issue[] {
    try {
      const directIssues = aiReview?.data?.bedrockResponse?.issues || aiReview?.data?.issues
      if (Array.isArray(directIssues)) {
        return directIssues.map((issue: any) => ({
          error_type: (issue?.severity || 'unknown').toLowerCase(),
          section: issue?.section?.trim() || 'unknown',
          description:
            issue?.description || issue?.severity_details || issue?.justification || 'unknown',
        }))
      }

      const rawText = String(
        aiReview?.data?.output_text || aiReview?.data?.content?.[0]?.text || ''
      ).trim()
      if (!rawText) return []

      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      const parsedIssues = Array.isArray(parsed?.issues) ? parsed.issues : []

      return parsedIssues.map((issue: any) => ({
        error_type: (issue?.severity || 'unknown').toLowerCase(),
        section: issue?.section?.trim() || 'unknown',
        description:
          issue?.description || issue?.severity_details || issue?.justification || 'unknown',
      }))
    } catch {
      return []
    }
  }
}
