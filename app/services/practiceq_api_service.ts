import axios from 'axios'
import logger from '@adonisjs/core/services/logger'
import { practiceQConfig } from '#config/services'

// The webhook PracticeQ pushes carries text answers but drops the answers of
// table type questions entirely: Mental Status arrives as a question with no
// answer key at all. The REST API returns the full note, tables included, so
// those fields are fetched here and merged into the stored session.

export interface PracticeqQuestion {
  id?: string
  Id?: string
  text?: string
  Text?: string
  answer?: unknown
  Answer?: unknown
  rows?: unknown
  Rows?: unknown
  columns?: unknown
  Columns?: unknown
  columnNames?: unknown
  ColumnNames?: unknown
}

export function isPracticeqConfigured(): boolean {
  return Boolean(practiceQConfig.apiKey)
}

export async function fetchFullNote(noteId: string): Promise<Record<string, any> | null> {
  if (!isPracticeqConfigured()) return null

  try {
    const response = await axios.get(
      `${String(practiceQConfig.baseUrl).replace(/\/+$/, '')}/notes/${noteId}`,
      {
        headers: { 'X-Auth-Key': practiceQConfig.apiKey },
        timeout: 20000,
      }
    )
    return response.data ?? null
  } catch (error: any) {
    logger.error(
      `PracticeQ API fetch failed for note ${noteId}: ${error?.response?.status ?? ''} ${error.message}`
    )
    return null
  }
}

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const inner = record.text ?? record.Text ?? record.value ?? record.Value ?? record.answer
    if (inner !== undefined) return asText(inner)
    return Object.values(record).map(asText).filter(Boolean).join(', ')
  }
  return String(value)
}

/**
 * Flattens a table question into one readable string, one line per row, cells
 * paired with their column names when the API provides them:
 *
 *   Appearance: unkempt | Orientation: WNL | Behavior: guarded
 *
 * Defensive across the response shapes the API may use, since the exact shape
 * differs by question kind. Anything unrecognised yields '' rather than junk,
 * and the raw question is logged so the parser can be tightened against real
 * responses once the first ones arrive.
 */
export function flattenTableAnswer(question: PracticeqQuestion): string {
  const plain = asText(question.answer ?? question.Answer)
  if (plain) return plain

  const rows = question.rows ?? question.Rows
  if (!Array.isArray(rows) || rows.length === 0) return ''

  const columnsRaw =
    question.columns ?? question.Columns ?? question.columnNames ?? question.ColumnNames
  const columnNames = Array.isArray(columnsRaw) ? columnsRaw.map(asText) : []

  const lines = rows
    .map((row) => {
      if (row === null || row === undefined) return ''
      if (typeof row === 'string') return row.trim()

      if (Array.isArray(row)) {
        return row
          .map((cell, index) => {
            const cellText = asText(cell)
            if (!cellText) return ''
            const column = columnNames[index]
            return column ? `${column}: ${cellText}` : cellText
          })
          .filter(Boolean)
          .join(' | ')
      }

      const record = row as Record<string, unknown>
      return Object.entries(record)
        .map(([key, cell]) => {
          const cellText = asText(cell)
          if (!cellText) return ''
          // Numeric keys carry no meaning, real column names do.
          return /^\d+$/.test(key) ? cellText : `${key}: ${cellText}`
        })
        .filter(Boolean)
        .join(' | ')
    })
    .filter(Boolean)

  return lines.join('\n')
}

/**
 * The table content of a full note, keyed by question id. Only questions that
 * produce text are returned, so a question with no table content is absent
 * rather than present and empty.
 */
export function extractTableAnswers(fullNote: Record<string, any>): Record<string, string> {
  const questions: PracticeqQuestion[] = fullNote?.Questions ?? fullNote?.questions ?? []
  const answers: Record<string, string> = {}

  for (const question of questions) {
    const id = question.id ?? question.Id
    if (!id) continue

    const text = flattenTableAnswer(question)
    if (text) answers[id] = text
  }

  return answers
}
