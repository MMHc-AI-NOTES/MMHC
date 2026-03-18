import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { buildTestDataset } from '#services/note_service'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3DatasetConfig } from '#config/services'

export default class BuildDataset extends BaseCommand {
  static commandName = 'notes:build-dataset'

  static description =
    'Build dataset.json from 10 real notes using CURRENT_SESSION/PREVIOUS_SESSION and issues'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Building dataset.json from latest notes...')

    try {
      const dataset = await buildTestDataset()
      this.logger.success(`dataset.json written with ${dataset.length} records`)

      // Upload to S3
      const filePath = app.makePath('dataset.json')
      const body = await fs.readFile(filePath)

      const bucket = s3DatasetConfig.bucket
      const prefix = s3DatasetConfig.prefix || ''
      const key = `${prefix.replace(/^\/*/, '').replace(/\/+$/, '')}/dataset.json`

      const client = new S3Client({
        region: s3DatasetConfig.region,
      })

      this.logger.info(`Uploading dataset.json to s3://${bucket}/${key} ...`)
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'application/json',
        })
      )
      this.logger.success('Upload to S3 completed')
    } catch (error: any) {
      this.logger.error('Failed to build dataset.json')
      this.logger.fatal(error?.message || String(error))
      process.exit(1)
    }

    process.exit(0)
  }
}
