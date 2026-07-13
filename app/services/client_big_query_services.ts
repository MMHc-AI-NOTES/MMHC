import { BigQuery } from '@google-cloud/bigquery'
import { bigQueryConfig } from '#config/bigquery'

class BigQueryService {
  public client: any
  private booted = false

  public async boot() {
    /**
     * Ignore multiple calls to the boot method
     */
    if (this.booted) {
      return
    }

    this.client = new BigQuery({
      projectId: bigQueryConfig.projectId,
      credentials: {
        client_email: bigQueryConfig.clientEmail,
        private_key: bigQueryConfig.privateKey,
      },
    })

    this.booted = true
  }
}

export const bigQueryService = new BigQueryService()
