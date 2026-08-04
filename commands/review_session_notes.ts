import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { invokeSessionReview } from '#services/session_review_service'
import fs from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
// @ts-ignore
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3DatasetConfig } from '#config/services'

interface Issue {
  error_type: string
  section: string
  description: string
  comment: string | null
}

interface SmeReviewerIssues {
  sme_reviewer: string
  issues: Issue[]
}

interface SmeIssueRow {
  reviewer_id: number | null
  sme_reviewer: string | null
  error_type: string | null
  section: string | null
  description: string | null
  comment: string | null
}

interface ReviewOutput {
  client_id: string | null
  current_session_note_id: string
  previous_session_note_id: string | null
  current_session: string
  previous_session: string | null
  sme_issues: SmeReviewerIssues[]
  ai_issues: Issue[]
}

export default class ReviewSessionNotes extends BaseCommand {
  static commandName = 'session:review-notes'

  static description = 'Review session notes from database via AI - supports range-based indexing'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.number({ description: 'Start ID (inclusive, default: 0)' })
  declare from?: number

  @flags.number({ description: 'End ID (inclusive, default: 60)' })
  declare to?: number

  @flags.string({ description: 'Comma-separated session IDs, e.g. 1,2,3,100,200' })
  declare ids?: string

  @flags.string({ description: 'Output file (default: session_review_output.json)' })
  declare output?: string

  async run() {
    try {
      const selectedIds = this.parseIds(this.ids)
      const hasExplicitIds = selectedIds.length > 0
      const from = this.from || 0
      const to = this.to || 60
      const now = new Date()
      const date = now.toISOString().slice(0, 10)
      const epoch = Math.floor(now.getTime() / 1000)
      const outputFile = this.output || `AIReview-${date}-${epoch}.json`

      if (this.ids && !hasExplicitIds) {
        this.logger.error(
          'Invalid --ids value. Use comma-separated numeric IDs, e.g. 1,2,3 or [1,2,3]'
        )
        return
      }

      if (!hasExplicitIds && from > to) {
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

      this.logger.info(
        hasExplicitIds
          ? `Selected IDs: ${selectedIds.join(', ')}`
          : `Range: ID BETWEEN ${from} AND ${to}`
      )

      let notesToReview = await db
        .from('session as s')
        .leftJoin('patients as p', 's.patient_id', 'p.id')
        .whereNull('s.deleted_at')
        .if(hasExplicitIds, (query) => {
          query.whereIn('s.id', selectedIds)
        })
        .if(!hasExplicitIds, (query) => {
          query.whereBetween('s.id', [from, to])
        })
        .select(
          's.id',
          's.note_id',
          's.session',
          's.session_time',
          's.patient_id',
          's.parent_note_id',
          'p.client_id'
        )

      if (hasExplicitIds) {
        const orderMap = new Map(selectedIds.map((id, index) => [id, index]))
        notesToReview = notesToReview.sort(
          (a, b) =>
            (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        )

        const foundIds = new Set(notesToReview.map((note) => note.id))
        const missingIds = selectedIds.filter((id) => !foundIds.has(id))
        if (missingIds.length > 0) {
          this.logger.warning(`Missing session IDs: ${missingIds.join(', ')}`)
        }
      }

      this.logger.info(`Fetched ${notesToReview.length} notes`)

      const results: ReviewOutput[] = []
      let reviewed = 0

      for (let i = 0; i < notesToReview.length; i++) {
        const note = notesToReview[i]

        try {
          const smeIssues = await this.fetchSmeIssues(note.note_id)

          this.logger.info(
            `[${i + 1}/${notesToReview.length}] ${note.note_id} (${smeIssues.length} SME issues)`
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
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
          })

          const aiIssues = this.extractAiIssues(aiReview)

          results.push({
            client_id: note.client_id || null,
            current_session_note_id: note.note_id,
            previous_session_note_id: previousNoteId,
            current_session: note.session,
            previous_session: previousSession,
            sme_issues: smeIssues,
            ai_issues: aiIssues,
          })

          reviewed++
          this.logger.info(`  Done (${aiIssues.length} AI issues)`)
        } catch (error: any) {
          this.logger.error(`  Failed: ${error.message}`)
        }
      }

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

  private async fetchSmeIssues(noteId: string): Promise<SmeReviewerIssues[]> {
    const rows = (await db
      .from('sme_issues')
      .where('note_id', noteId)
      .whereNull('sme_issues.deleted_at')
      .leftJoin('issues_related_to', 'sme_issues.issues_related_to_id', 'issues_related_to.id')
      .leftJoin('issue_descriptions', 'sme_issues.issue_description_id', 'issue_descriptions.id')
      .leftJoin('error_types', 'sme_issues.error_type_id', 'error_types.id')
      .leftJoin('users', 'sme_issues.reviewer_id', 'users.id')
      .select(
        'sme_issues.reviewer_id',
        'users.full_name as sme_reviewer',
        'error_types.name as error_type',
        'issues_related_to.display_name as section',
        'issue_descriptions.description',
        'sme_issues.comment'
      )) as SmeIssueRow[]

    const groupedIssues = new Map<number | string, SmeReviewerIssues>()

    for (const row of rows) {
      const reviewerName = row.sme_reviewer || 'unknown'
      const reviewerKey = row.reviewer_id ?? `unknown:${reviewerName}`
      const existingGroup = groupedIssues.get(reviewerKey) || {
        sme_reviewer: reviewerName,
        issues: [],
      }

      existingGroup.issues.push({
        error_type: row.error_type || 'unknown',
        section: row.section || 'unknown',
        description: row.description || 'unknown',
        comment: row.comment || null,
      })

      groupedIssues.set(reviewerKey, existingGroup)
    }

    return Array.from(groupedIssues.values())
  }

  private extractAiIssues(aiReview: any): Issue[] {
    try {
      const directIssues = aiReview?.data?.bedrockResponse?.issues || aiReview?.data?.issues
      if (!Array.isArray(directIssues)) {
        return []
      }

      return directIssues
        .map((issue: any): Issue | null => {
          const errorType = String(issue?.severity || '')
            .trim()
            .toLowerCase()
          const section = String(issue?.section || '').trim()
          const description = String(
            issue?.severity_details || issue?.description || issue?.justification || ''
          ).trim()

          if (
            !errorType ||
            !section ||
            !description ||
            errorType === 'unknown' ||
            section === 'unknown' ||
            description === 'unknown'
          ) {
            return null
          }

          return {
            error_type: errorType,
            section,
            description,
            comment: null,
          }
        })
        .filter((issue): issue is Issue => issue !== null)
    } catch {
      return []
    }
  }

  private parseIds(rawIds?: string): number[] {
    if (!rawIds) {
      return []
    }

    const normalizedIds = rawIds.trim().replace(/^\[/, '').replace(/\]$/, '')

    return Array.from(
      new Set(
        normalizedIds
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    )
  }
}
