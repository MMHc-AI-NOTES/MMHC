import isEqual from 'lodash.isequal'
import WebhookSessionVersion from '#models/webhook_session_version'
import SmeIssue from '#models/sme_issue'

/**
 * Compare two JSON objects and determine if they are different
 * @param json1 - First JSON object (can be object or stringified JSON)
 * @param json2 - Second JSON object (can be object or stringified JSON)
 * @returns true if JSONs are different, false if they are the same
 */
export const compareJsonObjects = (json1: string | object, json2: string | object): boolean => {
  try {
    let obj1: any
    let obj2: any

    if (typeof json1 === 'string') {
      obj1 = JSON.parse(json1)
    } else {
      obj1 = json1
    }

    if (typeof json2 === 'string') {
      obj2 = JSON.parse(json2)
    } else {
      obj2 = json2
    }

    return !isEqual(obj1, obj2)
  } catch (error) {
    console.log('Error comparing JSON objects:', error)
    return true
  }
}

/**
 * Get the most recent webhook session version for a note
 * @param noteId - The note ID to search for
 * @returns The most recent WebhookSessionVersion or null
 */
export const getLatestWebhookSessionVersion = async (
  noteId: string
): Promise<WebhookSessionVersion | null> => {
  try {
    const latestVersion = await WebhookSessionVersion.query()
      .where('note_id', noteId)
      .orderBy('created_at', 'desc')
      .first()

    return latestVersion
  } catch (error) {
    console.log('Error getting latest webhook session version:', error)
    return null
  }
}

/**
 * Store a new webhook session version if it's different from the previous one
 * @param noteId - The note ID
 * @param sessionJson - The session JSON (can be object or stringified JSON)
 * @returns Object with stored status and version info
 */
export const storeWebhookSessionVersionIfDifferent = async (
  noteId: string,
  sessionJson: string | object
): Promise<{
  stored: boolean
  version: WebhookSessionVersion | null
  message: string
}> => {
  try {
    // Convert sessionJson to string if it's an object
    let sessionJsonString: string
    if (typeof sessionJson === 'object' && sessionJson !== null) {
      sessionJsonString = JSON.stringify(sessionJson)
    } else {
      sessionJsonString = sessionJson as string
    }

    // Get the latest version for this note
    const latestVersion = await getLatestWebhookSessionVersion(noteId)

    // If no previous version exists, store this one
    if (!latestVersion) {
      const newVersion = await WebhookSessionVersion.create({
        noteId: noteId,
        sessionJson: sessionJsonString,
      })

      return {
        stored: true,
        version: newVersion,
        message: 'First version stored for this note',
      }
    }

    // Compare with latest version
    const isDifferent = compareJsonObjects(sessionJsonString, latestVersion.sessionJson)

    // If JSONs are the same, don't store
    if (!isDifferent) {
      return {
        stored: false,
        version: latestVersion,
        message: 'JSON is same as previous version, not stored',
      }
    }

    // JSONs are different, store new version
    const newVersion = await WebhookSessionVersion.create({
      noteId: noteId,
      sessionJson: sessionJsonString,
    })

    // Copy previous version's SME issues to the new version
    const previousSmeIssues = await SmeIssue.query().where('version_id', latestVersion.id)
    if (previousSmeIssues.length > 0) {
      await SmeIssue.createMany(
        previousSmeIssues.map((issue) => ({
          reviewerId: issue.reviewerId,
          errorTypeId: issue.errorTypeId,
          issuesRelatedToId: issue.issuesRelatedToId,
          issueDescriptionId: issue.issueDescriptionId,
          noteId: issue.noteId,
          versionId: newVersion.id,
          status: issue.status,
          comment: issue.comment,
        }))
      )
    }

    return {
      stored: true,
      version: newVersion,
      message: 'New version stored (JSON is different from previous)',
    }
  } catch (error: any) {
    console.log('Error storing webhook session version:', error.message)
    throw error
  }
}
