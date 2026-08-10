import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { syncProgressNoteCodebook } from '#services/progress_note_codebook_sync'

/**
 * Applies the finalized progress note codebook to the SME templates.
 *
 * Never runs on deploy. Dry run by default; pass --apply to write. Meant to
 * be run once per environment when a codebook version goes live, coordinated
 * with the scorer moving to the same version.
 */
export default class SyncProgressNoteCodebook extends BaseCommand {
  static commandName = 'codebook:sync'
  static description = 'Sync SME templates for progress note sections to the finalized codebook'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Write the changes. Without this flag nothing is modified.' })
  declare apply: boolean

  async run() {
    const result = await syncProgressNoteCodebook({ apply: this.apply })
    const mode = this.apply ? '' : ' (dry run, nothing written)'

    this.logger.info(
      `Codebook sync${mode}: ${result.created} to create, ${result.updated} to update, ` +
        `${result.unchanged} already correct, ${result.removed} to remove, ` +
        `${result.orphansCleaned} unused description(s) to clean`
    )

    if (!this.apply && (result.created || result.updated || result.removed)) {
      this.logger.info('Run again with --apply to write these changes.')
    }
  }
}
