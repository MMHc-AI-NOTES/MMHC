import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { buildTestDataset } from '#services/note_service'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3DatasetConfig } from '#config/services'

export default class BuildDataset extends BaseCommand {
  static commandName = 'notes:build-dataset'

  static description = 'Build and upload dataset file for target env (dev/stag)'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({
    description: 'Target key (dev or stag)',
    required: false,
  })
  declare target?: string

  @flags.string({
    alias: 'e',
    description: 'Target key (dev or stag). Example: --env=dev',
  })
  declare env?: string

  async run() {
    const rawTarget = (this.target || this.env || 'dev').toLowerCase()
    const targetEnv = rawTarget === 'stage' ? 'stag' : rawTarget
    if (!['dev', 'stag'].includes(targetEnv)) {
      this.logger.error('Invalid target value. Allowed: dev, stag/stage')
      process.exit(1)
    }

    const fileName = targetEnv === 'stag' ? 'dataset-stag.json' : 'dataset-dev.json'
    const jsonlFileName = fileName.replace(/\.json$/, '.jsonl')

    this.logger.info(`Building ${fileName} from latest notes...`)

    try {
      const dataset = await buildTestDataset(fileName)
      this.logger.success(`${fileName} written with ${dataset.length} records`)

      // Build JSONL file (one JSON object per line)
      const jsonlContent = dataset.map((row: any) => JSON.stringify(row)).join('\n')
      const jsonlPath = app.makePath(jsonlFileName)
      await fs.writeFile(jsonlPath, jsonlContent, 'utf8')
      this.logger.success(`${jsonlFileName} written with ${dataset.length} lines`)

      const bucket = s3DatasetConfig.bucket
      const basePath = s3DatasetConfig.basePath || ''
      const normalizedBasePath = basePath.replace(/^\/*/, '').replace(/\/+$/, '')
      const client = new S3Client({
        region: s3DatasetConfig.region,
      })

      // Upload JSON
      const jsonPath = app.makePath(fileName)
      const jsonBody = await fs.readFile(jsonPath)
      const jsonKey = `${normalizedBasePath}/${fileName}`

      this.logger.info(`Uploading ${fileName} to s3://${bucket}/${jsonKey} ...`)
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: jsonKey,
          Body: jsonBody,
          ContentType: 'application/json',
        })
      )

      // Upload JSONL
      const jsonlBody = await fs.readFile(jsonlPath)
      const jsonlKey = `${normalizedBasePath}/${jsonlFileName}`
      this.logger.info(`Uploading ${jsonlFileName} to s3://${bucket}/${jsonlKey} ...`)
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: jsonlKey,
          Body: jsonlBody,
          ContentType: 'application/jsonlines',
        })
      )

      this.logger.success('JSON and JSONL uploads to S3 completed')
    } catch (error: any) {
      this.logger.error('Failed to build/upload dataset files')
      this.logger.fatal(error?.message || String(error))
      process.exit(1)
    }

    process.exit(0)
  }
}
