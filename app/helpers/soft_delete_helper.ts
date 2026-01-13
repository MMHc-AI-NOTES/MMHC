import User from '#models/user'
import { BaseModel } from '@adonisjs/lucid/orm'
import { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { cuid } from '@adonisjs/core/helpers'

export const softDeleteQuery = (query: ModelQueryBuilderContract<typeof BaseModel>) => {
  query.whereNull(`${query.model.table}.deleted_at`)
}

export const softDeleteUser = async (row: User) => {
  const rand = cuid()
  const deleteEmail = row['email']
  if (row.deletedAt === null) {
    row.deletedAt = DateTime.now()
    row['email'] = deleteEmail.concat('_', rand)
  }
  await row.save()
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Extracts text content from a specific section in a note
 * @param noteText - The complete note text
 * @param sectionHeading - The section heading to search for (e.g., "Suicidality", "Assessment & Therapeutic Intervention")
 * @returns The extracted section text, trimmed of whitespace, or empty string if not found
 *
 * @example
 * const note = "Suicidality: Denied\n\nHomicidality: Not reported"
 * const text = extractSectionText(note, "Suicidality")
 * // Returns: "Denied"
 */
export const extractSectionText = (noteText: string, sectionHeading: string): string => {
  if (!noteText || !sectionHeading) {
    return ''
  }

  // Escape special regex characters in section heading (like & in "Assessment & Therapeutic Intervention")
  const escapedSection = sectionHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Pattern explanation:
  // - ${escapedSection}:? - Match the section heading followed by optional colon
  // - \s* - Match optional whitespace after the colon
  // - (.+?) - Capture text (non-greedy) until we hit a stopping point:
  //   - \n\n (double newline - section separator)
  //   - \n[A-Z][^:]*: (next section starting with capital letter and colon)
  //   - \n?$ (end of string with optional newline)
  const regex = new RegExp(
    `${escapedSection}\\s*:?\\s*(.+?)(?=\\n\\n|\\n[A-Z][^:]*:|\\n?$)`,
    'is' // i = case insensitive, s = dotAll (. matches newlines)
  )

  const match = noteText.match(regex)
  return match ? match[1].trim() : ''
}

/**
 * Extracts multiple sections from a note based on a key-to-heading map
 * @param noteText - The complete note text
 * @param keyMap - Object mapping keys to section headings
 * @returns Object with keys mapped to their extracted section texts
 *
 * @example
 * const keyMap = { suicidality: 'Suicidality', homicidality: 'Homicidality' }
 * const sections = extractMultipleSections(note, keyMap)
 * // Returns: { suicidality: 'Denied', homicidality: 'Not reported' }
 */
export const extractMultipleSections = (
  noteText: string,
  keyMap: Record<string, string>
): Record<string, string> => {
  const sections: Record<string, string> = {}

  for (const [key, heading] of Object.entries(keyMap)) {
    sections[key] = extractSectionText(noteText, heading)
  }

  return sections
}
