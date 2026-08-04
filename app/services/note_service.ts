import Session, { sessionFilterEnum, sessionSortEnum } from '#models/session'
import User from '#models/user'
import Patient from '#models/patient'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess, sendError } from '#services/custom_response_service'
import {
  formatFeedbackVerdictResponse,
  loadFeedbackVerdictsForSession,
} from '#services/feedback_service'
import { AiStatusEnum, HumanReviewEnum, ManagerEnum, WorkflowEnum } from '#enums/session_enum'
import { UserTypeEnum } from '#enums/user_type_enum'
import { DateTime } from 'luxon'
import Chat from '#models/chat'
import type { updateNoteValidatorInterface } from '#validators/note_validator'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'
import db from '@adonisjs/lucid/services/db'
import { AuditActionEnum } from '#enums/audit_log_enum'
import logger from '@adonisjs/core/services/logger'

export async function getDiagnosisFromAuditLog(noteId: string): Promise<Record<string, any>[]> {
  if (!noteId || typeof noteId !== 'string' || !noteId.trim()) {
    return []
  }

  const auditLog = await db
    .from('audit_logs')
    .where('note_id', noteId.trim())
    .where('action', AuditActionEnum.webhookSessionReceived)
    .select('metadata')
    .first()

  if (!auditLog?.metadata) {
    return []
  }

  let meta: any = null
  if (typeof auditLog.metadata === 'string') {
    const trimmed = auditLog.metadata.trim()
    if (!trimmed) return []
    try {
      meta = JSON.parse(trimmed)
    } catch {
      logger.warn('[AuditLog] Failed to parse JSON metadata for diagnosis', { noteId })
      return []
    }
  } else {
    meta = auditLog.metadata
  }

  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return []
  }

  const raw = meta?.raw_payload?.Diagnosis
  return Array.isArray(raw) ? raw : []
}

/**
 * The form name PracticeQ sent with the note. Not stored on the session, so it
 * comes back from the payload kept in the audit log.
 */
export async function getNoteNameFromAuditLog(noteId: string): Promise<string> {
  if (!noteId || typeof noteId !== 'string' || !noteId.trim()) {
    return ''
  }

  const auditLog = await db
    .from('audit_logs')
    .where('note_id', noteId.trim())
    .where('action', AuditActionEnum.webhookSessionReceived)
    .select('metadata')
    .first()

  if (!auditLog?.metadata) return ''

  let meta: any = null
  if (typeof auditLog.metadata === 'string') {
    const trimmed = auditLog.metadata.trim()
    if (!trimmed) return ''
    try {
      meta = JSON.parse(trimmed)
    } catch {
      logger.warn('[AuditLog] Failed to parse JSON metadata for note name', { noteId })
      return ''
    }
  } else {
    meta = auditLog.metadata
  }

  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return ''
  }

  const payload = meta?.raw_payload
  const name = payload?.NoteName ?? payload?.noteName ?? payload?.Type ?? payload?.type
  return typeof name === 'string' ? name.trim() : ''
}

/**
 * Serialize a note with nested children for listing.
 * Child notes don't include previous_note (parent) since parent is already in tree above.
 */
const serializeNoteWithChildren = (note: any, isChild = false): any => {
  const serialized = note.serialize()
  // parent_note_id = newer note. Current = latest (parent_note_id === null). Previous = older = note that has us as parent (childNotes[0]).
  const isCurrentNote = serialized.parent_note_id === null
  const prev = (note.childNotes || [])[0]
  const previousNote = isChild ? null : prev ? prev.serialize() : null
  const versions = serialized.webhookVersions ?? serialized.webhook_versions ?? []
  const versionsWithPrev = versions.map((v: any) => ({
    ...v,
    previous_note: prev ? prev.serialize() : null,
  }))
  serialized.webhookVersions = versionsWithPrev
  delete serialized.webhook_versions
  const children = (note.childNotes || []).map((child: any) =>
    serializeNoteWithChildren(child, true)
  )
  return {
    ...serialized,
    is_current_note: isCurrentNote,
    previous_note: previousNote,
    chat_count: note.$extras?.chat_count || 0,
    version_count: note.$extras?.version_count || 0,
    reviewers: extractReviewers(serialized),
    children,
  }
}

/**
 * Extract unique reviewers from a serialized note object
 */
const extractReviewers = (serialized: any): any[] => {
  const reviewersMap = new Map<number, any>()

  // Helper to add reviewer if exists
  const addReviewer = (id: number | null, reviewer: any) => {
    if (id && reviewer) {
      reviewersMap.set(id, reviewer)
    }
  }

  // From direct humanReviews
  serialized.human_reviews?.forEach((review: any) => {
    addReviewer(review.reviewer_id, review.reviewer)
  })

  // From humanReviews through chats
  serialized.chats?.forEach((chat: any) => {
    chat.human_reviews?.forEach((review: any) => {
      addReviewer(review.reviewer_id, review.reviewer)
    })
  })

  // From SME Issues through webhookVersions
  serialized.webhook_versions?.forEach((version: any) => {
    version.sme_issues?.forEach((issue: any) => {
      const reviewerId = issue.reviewer_id ?? issue.reviewerId
      addReviewer(reviewerId, issue.reviewer)
    })
  })

  // From note review marks (user marked note as reviewed)
  serialized.note_review_marks?.forEach((mark: any) => {
    addReviewer(mark.reviewer_id, mark.reviewer)
  })

  return Array.from(reviewersMap.values())
}

const filterSmeIssuesInVersion = (version: any, user: User | null) => {
  if (!user || user.type === UserTypeEnum.superAdmin) {
    return version
  }

  const smeIssues = version.sme_issues ?? version.smeIssues ?? []
  const filteredIssues = smeIssues.filter(
    (issue: any) => (issue.reviewer_id ?? issue.reviewerId) === user.id
  )

  if (version.sme_issues) {
    return { ...version, sme_issues: filteredIssues }
  }

  if (version.smeIssues) {
    return { ...version, smeIssues: filteredIssues }
  }

  return version
}

export const noteListing = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>,
  user?: User | null
) => {
  try {
    let query: any
    let filterData: any
    let sortNote: any

    let noteListings: any = Session.query()
      .preload('practitioner')
      .preload('patient')
      .preload('parentNote')
      // Only childNotes[0]'s id/noteId are read below, so its own practitioner/patient
      // rows are never used on the list and aren't worth preloading for every row.
      .preload('childNotes')
      .preload('chats', (chatsQuery) => {
        chatsQuery.orderBy('id', 'desc').preload('humanReviews', (humanReviewsQuery) => {
          humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
        })
      })
      .preload('humanReviews', (humanReviewsQuery) => {
        humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
      })
      .preload('webhookVersions', (versionsQuery) => {
        // extractReviewers only reads sme_issues.reviewer; errorType/issuesRelatedTo/
        // issueDescription are detail-page fields the list never serializes.
        versionsQuery.preload('smeIssues', (smeIssuesQuery) => {
          smeIssuesQuery.preload('reviewer')
        })
        versionsQuery.orderBy('id', 'desc')
      })
      .preload('noteReviewMarks', (marksQuery) => {
        marksQuery.preload('reviewer')
      })
      .withCount('chats', (countQuery) => {
        countQuery.as('chat_count')
      })
      .withCount('webhookVersions', (countQuery) => {
        countQuery.as('version_count')
      })

    let searchFilter: any = null
    let notReviewedByUserIdFilter: any = null
    let notReviewedFilter: any = null
    let otherFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else if (filter.columnName === 'not_reviewed_by_user_id') {
          notReviewedByUserIdFilter = filter
        } else if (filter.columnName === 'not_reviewed') {
          notReviewedFilter = filter
        } else {
          otherFilters.push(filter)
        }
      })
    }

    // Handle filter for notes not reviewed by a specific user
    // Meaning: notes jinko is user ne review nahi kia (chahe kisi aur ne kia ho ya na ho)
    if (notReviewedByUserIdFilter && notReviewedByUserIdFilter.value) {
      const userId = Number.parseInt(String(notReviewedByUserIdFilter.value))
      if (!Number.isNaN(userId)) {
        noteListings = noteListings.whereNotExists((subQuery: any) => {
          subQuery
            .from('human_reviews')
            .whereRaw('human_reviews.note_id = session.note_id')
            .where('human_reviews.reviewer_id', userId)
            .whereNull('human_reviews.deleted_at')
        })
      }
    }

    // Handle filter for notes not reviewed by any user
    if (notReviewedFilter && String(notReviewedFilter.value) === 'true') {
      noteListings = noteListings.whereNotExists((subQuery: any) => {
        subQuery
          .from('human_reviews')
          .whereRaw('human_reviews.note_id = session.note_id')
          .whereNull('human_reviews.deleted_at')
      })
    }

    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`

        // 1. Practitioner name: users (type=practitioner) → practitioner_id IN (ids)
        const practitionerIds = await User.query()
          .select('id')
          .where('type', UserTypeEnum.practitioner)
          .whereILike('full_name', searchPattern)
          .then((rows) => rows.map((r) => r.id))

        // 2. Client ID: patients.client_id → patient_id IN (ids)
        const patientIds = await Patient.query()
          .select('id')
          .whereILike('client_id', searchPattern)
          .then((rows) => rows.map((r) => r.id))

        noteListings = noteListings.where((subQuery: any) => {
          subQuery.whereILike('note_id', searchPattern)
          if (practitionerIds.length > 0) {
            subQuery.orWhereIn('practitioner_id', practitionerIds)
          }
          if (patientIds.length > 0) {
            subQuery.orWhereIn('patient_id', patientIds)
          }
        })
      }
    }

    if (otherFilters?.length) {
      filterData = applyFilters(noteListings, otherFilters, sessionFilterEnum)
    }
    if (filterData?.status === false) {
      return {
        status: filterData.status,
        message: filterData.message,
      }
    }
    query = filterData?.query ?? noteListings
    if (sorts?.length) {
      sortNote = applySorting(query, sorts, sessionSortEnum)
      if (sortNote?.status) {
        return sortNote
      }
    }
    let sortQuery = sortNote?.query ?? query
    let noteListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    return {
      count: noteListingPaginated['rows'].length,
      total_count: noteListingPaginated.total,
      total_page_count: noteListingPaginated.lastPage,
      page: noteListingPaginated.currentPage,
      page_size: noteListingPaginated.perPage,
      data: noteListingPaginated['rows'].map((note: any) => {
        const serialized = note.serialize()
        // parent_note_id = newer note. Current = parent_note_id === null. Previous = older = childNotes[0]. Child = newer = parentNote.
        const isCurrentNote = serialized.parent_note_id === null
        const prev = (note.childNotes || [])[0]
        const previousNote = prev ? { id: prev.id, note_id: prev.noteId } : null
        const childNote = note.parentNote
          ? {
              id: note.parentNote.id,
              note_id: note.parentNote.noteId,
              parent_note_id: note.parentNote.parentNoteId,
            }
          : null
        const versions = serialized.webhookVersions ?? serialized.webhook_versions ?? []
        const versionsWithPrev = versions.map((v: any) => {
          const versionWithPrev = {
            ...v,
            previous_note: prev ? prev.serialize() : null,
          }

          return filterSmeIssuesInVersion(versionWithPrev, user ?? null)
        })
        serialized.webhookVersions = versionsWithPrev
        delete serialized.webhook_versions
        return {
          ...serialized,
          is_current_note: isCurrentNote,
          previous_note: previousNote,
          child_note: childNote,
          chat_count: note.$extras.chat_count || 0,
          version_count: note.$extras.version_count || 0,
          reviewers: extractReviewers(serialized),
        }
      }),
    }
  } catch (error: any) {
    logger.error('Error in noteListing:', error.message)
    throw new Error('Failed to retrieve notes. Please try again later.')
  }
}

export const getNoteWithChats = async (noteId: string, user?: User | null) => {
  try {
    const note = await Session.query()
      .where('note_id', noteId)
      .preload('practitioner')
      .preload('patient')
      .preload('parentNote')
      .preload('childNotes', (childQuery) => {
        childQuery.preload('practitioner').preload('patient')
      })
      .preload('chats', (chatsQuery) => {
        chatsQuery
          .orderBy('id', 'desc')
          .limit(10)
          .preload('humanReviews', (humanReviewsQuery) => {
            humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
          })
      })
      .preload('humanReviews', (humanReviewsQuery) => {
        humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
      })
      .preload('webhookVersions', (versionsQuery) => {
        versionsQuery.preload('smeIssues', (smeIssuesQuery) => {
          smeIssuesQuery.preload('errorType')
          smeIssuesQuery.preload('issuesRelatedTo')
          smeIssuesQuery.preload('issueDescription')
          smeIssuesQuery.preload('reviewer')
        })
        versionsQuery.orderBy('id', 'desc')
      })
      .preload('noteReviewMarks', (marksQuery) => {
        marksQuery.preload('reviewer')
      })
      .withCount('chats', (countQuery) => {
        countQuery.as('chat_count')
      })
      .withCount('webhookVersions', (countQuery) => {
        countQuery.as('version_count')
      })
      .first()

    if (!note) {
      logger.error('Error in getNoteWithChats: Note not found for note_id:', noteId)
      throw new Error('Note not found for the provided note ID')
    }

    const [diagnosis, feedbackVerdicts] = await Promise.all([
      getDiagnosisFromAuditLog(noteId),
      loadFeedbackVerdictsForSession(note.id),
    ])

    const serialized = note.serialize()
    // parent_note_id = newer note. Current = parent_note_id === null. Previous = older = childNotes[0]. Child = newer = parentNote.
    const isCurrentNote = serialized.parent_note_id === null
    const prev = (note.childNotes || [])[0]
    const previousNote = prev ? prev.serialize() : null
    const childNote = note.parentNote
      ? {
          id: note.parentNote.id,
          note_id: note.parentNote.noteId,
          parent_note_id: note.parentNote.parentNoteId,
        }
      : null
    const versions = serialized.webhookVersions ?? serialized.webhook_versions ?? []
    const versionsWithPrev = versions.map((v: any) => {
      const versionWithPrev = {
        ...v,
        previous_note: prev ? prev.serialize() : null,
      }

      return filterSmeIssuesInVersion(versionWithPrev, user ?? null)
    })
    serialized.webhookVersions = versionsWithPrev
    delete serialized.webhook_versions
    delete serialized.feedbackVerdicts
    delete serialized.feedback_verdicts

    const noteWithCount = {
      ...serialized,
      is_current_note: isCurrentNote,
      previous_note: previousNote,
      child_note: childNote,
      chat_count: note.$extras.chat_count || 0,
      version_count: note.$extras.version_count || 0,
      reviewers: extractReviewers(serialized),
      diagnosis,
      feedback_verdicts: feedbackVerdicts.map(formatFeedbackVerdictResponse),
    }

    return sendSuccess('Note with chats retrieved successfully', noteWithCount)
  } catch (error: any) {
    logger.error('Error while getting note with chat', error.message)
    throw new Error('error while getting note with chat')
  }
}

export const getQueueStatistics = async (startDate?: string, endDate?: string) => {
  try {
    // Set default dates if not provided (yesterday to today)
    let startDateTime: DateTime
    let endDateTime: DateTime

    if (startDate && endDate) {
      startDateTime = DateTime.fromISO(startDate).startOf('day')
      endDateTime = DateTime.fromISO(endDate).endOf('day')
    } else {
      // Default: yesterday to today
      endDateTime = DateTime.now().endOf('day')
      startDateTime = endDateTime.minus({ days: 1 }).startOf('day')
    }

    // Build query with date filtering
    let query = Session.query().select('ai_status', 'human_review', 'manager', 'workflow')

    // Apply date filter on created_at
    query = query
      .where('created_at', '>=', startDateTime.toSQL()!)
      .where('created_at', '<=', endDateTime.toSQL()!)

    const sessions = await query

    // Initialize counters
    let aiPassed = 0
    let aiFailed = 0
    let pendingHumanReview = 0
    let pendingManagerReview = 0
    let blacklist = 0

    // Iterate through sessions and count
    sessions.forEach((session) => {
      // Count AI passed
      if (session.aiStatus === AiStatusEnum.passed) {
        aiPassed++
      }

      // Count AI failed
      if (session.aiStatus === AiStatusEnum.failed) {
        aiFailed++
      }

      // Count pending human review
      if (session.humanReview === HumanReviewEnum.pending) {
        pendingHumanReview++
      }

      // Count pending manager review
      if (session.manager === ManagerEnum.pending) {
        pendingManagerReview++
      }

      // Count blacklist
      if (session.workflow === WorkflowEnum.blacklisted) {
        blacklist++
      }
    })

    return {
      total_notes: sessions.length,
      ai_passed: aiPassed,
      ai_failed: aiFailed,
      pending_human_review: pendingHumanReview,
      pending_manager_review: pendingManagerReview,
      blacklist: blacklist,
    }
  } catch (error: any) {
    throw new Error(`Error retrieving queue statistics`)
  }
}

export const getWorkloadStatistics = async (userId: number) => {
  try {
    // 1. assign_notes - Count notes where user is the practitioner
    const assignedSessions = await Session.query().where('practitioner_id', userId)
    const assignNotes = assignedSessions.length

    // 2. avg_review_time - Calculate average response_time from chats where user_id matches
    const chatsWithResponseTime = await Chat.query()
      .where('user_id', userId)
      .whereNotNull('response_time')
      .select('response_time')

    let avgReviewTime = 0
    if (chatsWithResponseTime.length > 0) {
      const totalResponseTime = chatsWithResponseTime.reduce(
        (sum, chat) => sum + (chat.responseTime || 0),
        0
      )
      avgReviewTime = totalResponseTime / chatsWithResponseTime.length
      // Round to 2 decimal places
      avgReviewTime = Math.round(avgReviewTime * 100) / 100
    }

    // 3. return_rate - Dummy value for now (will be implemented in future)
    const returnRate = 15

    // 4. ai_disagreement_rate - Dummy value for now (will be implemented in future)
    const aiDisagreementRate = 30

    return {
      assign_notes: assignNotes,
      avg_review_time: avgReviewTime,
      return_rate: returnRate,
      ai_disagreement_rate: aiDisagreementRate,
    }
  } catch (error: any) {
    throw new Error(`Error retrieving workload statistics`)
  }
}

/**
 * Build a small JSON dataset from 10 real notes
 * and write it to dataset.json at the project root.
 */
export const buildTestDataset = async (fileName = 'dataset.json') => {
  try {
    const notes = await Session.query()
      .whereIn('note_id', (subQuery) => {
        subQuery
          .from('note_review_marks')
          .select('note_id')
          .where('marked_as_reviewed', true)
          .groupBy('note_id')
      })
      .preload('childNotes', (childQuery) => {
        childQuery.preload('practitioner').preload('patient')
      })
      .preload('webhookVersions', (versionsQuery) => {
        versionsQuery.preload('smeIssues', (smeIssuesQuery) => {
          smeIssuesQuery
            .preload('errorType')
            .preload('issuesRelatedTo')
            .preload('issueDescription')
            .preload('reviewer')
            .orderBy('id', 'asc')
        })
      })
      .orderBy('id', 'desc')

    const dataset = notes.map((note: any) => {
      const currentSerialized = note.serialize()
      const prev = (note.childNotes || [])[0]

      const noteId = currentSerialized.note_id || note.noteId

      // Prefer the documented sessionTime; fall back to createdAt
      const sessionTime = (note.sessionTime || currentSerialized.sessionTime) as
        | import('luxon').DateTime
        | undefined
      const createdAt = (note.createdAt || currentSerialized.createdAt) as
        | import('luxon').DateTime
        | undefined

      const sessionDate = sessionTime
        ? sessionTime.toFormat('yyyy-MM-dd HH:mm:ss')
        : createdAt
          ? createdAt.toFormat('yyyy-MM-dd HH:mm:ss')
          : null

      const CURRENT_SESSION = {
        note_id: noteId,
        session_date: sessionDate,
        session: currentSerialized.session || '',
      }

      const prevSerialized = prev ? prev.serialize() : null
      const prevSessionTime = (prev?.sessionTime || prevSerialized?.sessionTime) as
        | import('luxon').DateTime
        | undefined
      const prevCreatedAt = (prev?.createdAt || prevSerialized?.createdAt) as
        | import('luxon').DateTime
        | undefined
      const prevSessionDate = prevSessionTime
        ? prevSessionTime.toFormat('yyyy-MM-dd HH:mm:ss')
        : prevCreatedAt
          ? prevCreatedAt.toFormat('yyyy-MM-dd HH:mm:ss')
          : null

      const PREVIOUS_SESSION = {
        note_id: noteId,
        session_date: prev ? prevSessionDate : null,
        session: prevSerialized?.session || '',
      }

      // Collect SME issues, if any, and normalize shape
      const issues: Array<{
        issues_related_to: string | null
        issue_description: string | null
        issue_type: string | null
      }> = []
      const versions = (note.webhookVersions || []).map((v: any) => v)
      versions.forEach((version: any) => {
        ;(version.smeIssues || []).forEach((issue: any) => {
          const s = issue.serialize()
          issues.push({
            issues_related_to:
              (s.issuesRelatedTo?.displayName || s.issuesRelatedTo?.name || null)
                ?.toString()
                .toLowerCase() ?? null,
            issue_description: s.issueDescription?.description || null,
            issue_type: s.errorType?.name || null,
          })
        })
      })

      // Ensure deterministic order so repeated runs don't reshuffle issues
      issues.sort((a: any, b: any) => {
        if (a.id !== null && b.id !== null && a.id !== b.id) {
          return a.id - b.id
        }
        const aCreated = a.createdAt || ''
        const bCreated = b.createdAt || ''
        return String(aCreated).localeCompare(String(bCreated))
      })

      const getIssueDeduction = (issueType: string | null): number => {
        const normalized = (issueType || '').toLowerCase().trim()
        if (normalized === 'critical') return 25
        if (normalized === 'moderate') return 15
        if (normalized === 'minor') return 5
        return 0
      }

      const totalDeduction = issues.reduce((sum, issue) => {
        return sum + getIssueDeduction(issue.issue_type)
      }, 0)

      const score = Math.max(0, 100 - totalDeduction)
      const pass = score > 70

      return {
        instruction: `You are a licensed clinical documentation compliance reviewer evaluating mental health Progress Notes for clinical quality, billing integrity, and legal risk.
You MUST analyze the provided CURRENT_SESSION and PREVIOUS_SESSION strictly based on the written content ONLY.

❗ABSOLUTE RULES:
- Do NOT fabricate.
- Do NOT infer intent.
- Do NOT assume missing documentation.
- Do NOT normalize missing fields.
- If something is missing, unclear, vague, or empty, explicitly treat it as "Not documented in the note".
- Evaluate ALL sections in a SINGLE structured pass.
- If PREVIOUS_SESSION is not provided, evaluate CURRENT_SESSION only and skip duplication comparison.

SCORING FOUNDATION:
- Start score at 100.
- Apply deductions exactly as defined below.
- All deductions must be multiples of 5 only.
- Each violation must be listed separately in the issues array.
- Do NOT double-penalize the same exact issue within the same field.
- Pass = true ONLY if final score > 75.

DUPLICATION ENFORCEMENT (ZERO TOLERANCE – LITERAL MATCH ONLY)

A Critical duplication violation (-25) MUST be applied when:
1. A CURRENT field is 80% or more word-for-word identical to the corresponding PREVIOUS field.
2. The CURRENT field text appears verbatim inside the PREVIOUS field text (even if the previous field is longer).
3. A field is a near-exact copy with minimal wording changes.
4. A required field is 100% copied from the previous note.

IMPORTANT:
- Duplication comparison must be based ONLY on literal word-for-word similarity.
- Similar themes, topics, clinical focus, or subject matter (e.g., work stress, anxiety, mood) are NOT duplication.
- Common clinical phrases (e.g., active listening, empathic responding, coping skills, psychoeducation) MUST NOT trigger duplication unless the entire field is otherwise copied.
- Each duplicated field must receive its OWN –25 deduction.
- Do NOT combine multiple duplicated fields into one violation.
- Do NOT apply multiple –25 penalties to the same field.

FIELD-SPECIFIC EVALUATION RULES (STRICT)

MUST ONLY use the exact violation types explicitly listed under each field.
You MUST evaluate EACH field independently.
For EACH field, ONLY apply the violations listed under that field.
Do NOT invent additional rules.
Apply the exact severity and deduction defined below.
No new violation types may be introduced.
No interpretive labels or conceptual summaries may be created.
Violations must match the wording of listed criteria.
The same criterion may NOT be applied more than once within the same field.
If a documentation problem does not EXACTLY match a listed criterion, it must NOT be scored.


1. Subjective (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Slightly too definitive wording without legal risk
- Repetitive content excluding time, risk flags, or initials
Moderate (-15 pts each):
- Inconsistencies between two or more fields
- Subjective section describes activities/events rather than client internal experience
- Not specific to date of service
Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- SI/HI marked as "Present" but no safety plan included
- Overly definitive language without attribution
- Irrelevant or excessively long content copied from a previous note


2. Objective (Required)

Minor (-5 pts each):
- Repetitive content excluding time, risk flags, or initials
Moderate (-15 pts each):
- Field copy/paste from previous note
- Lack of observable behavior, affect, or presentation

3. Assessment & Therapeutic Intervention (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Slightly too definitive wording without legal risk
- Repetitive content excluding time, risk flags, or initials
Moderate (-15 pts each):
- No clinical interpretation
- No modality or intervention explanation
- Not specific to date of service
-Overly definitive language without attribution
- Inconsistencies between two or more fields
-Lacks Plan and Relevance to session
Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- Note lacks medical necessity
- SI/HI marked as "Present" but no safety plan included
- Irrelevant or excessively long content copied from a previous note


4. Reaction to Intervention (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Repetitive content excluding time, risk flags, or initials

Moderate (-15 pts each):
- Not specific to date of service
- Response not clearly linked to documented intervention

Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- SI/HI marked as "Present" but no safety plan included
- Irrelevant or excessively long content copied from a previous note


5. Plan and Collaboration (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Repetitive content excluding time, risk flags, or initials

Moderate (-15 pts each):
- Inconsistencies between two or more fields
- Not specific to date of service
- Plan is generic, continuity-only, or lacks actionable next steps

Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- Note lacks medical necessity
- SI/HI marked as "Present" but no safety plan included
- Irrelevant or excessively long content copied from a previous note


6. Progress (Required)

Minor (-5 pts each):
- Progress marked but not supported by note content

Moderate (-15 pts each):
- Inconsistencies between two or more fields


7. Therapist Initials (Required)

Critical (-25 pts):
- Therapist full name and credentials are missing

REQUIRED OUTPUT FORMAT (STRICT JSON ONLY)

{
  "score": <number 0-100>,
  "pass": <true | false>,
  "sentiment": null,
  "summary": null,
  "evaluation": null,
  "issues": [
    {
      "severity": "Critical | Moderate | Minor",
      "points_deducted": <number>,
      "section_id": "<section id or null>",
      "section": "<section name>",
      "justification": "Clear explanation of the issue"
    }
  ],
  "6tx9-1_subjective": null,
  "rb2f-1_objective": null,
  "zad8-1_asment_&_therapeutic_intervention": null,
  "ugq6-1_reaction_to_intervention": null,
  "hnfi-1_plan_and_collaboration": null,
  "9z5t-1_therapist_reflection": null,
  "gm4p-1_progress": null,
  "kxgx-7_&_kxgx-8_suicidality/homicidality": null
}

STRICT ENFORCEMENT:
- ALL keys MUST be present.
- No empty strings allowed.
- If no issues exist, return "issues": [].
- Do NOT add extra keys.
- Do NOT rename keys.
- Do NOT return markdown.
- Do NOT include explanations outside JSON.

Now evaluate the following Progress Note:`,
        CURRENT_SESSION,
        PREVIOUS_SESSION,
        output: {
          score,
          pass,
          issues,
        },
      }
    })

    const filePath = app.makePath(fileName)
    await fs.writeFile(filePath, JSON.stringify(dataset, null, 2), 'utf8')

    return dataset
  } catch (error: any) {
    logger.error('Error while building test dataset:', error.message)
    throw new Error('Failed to build test dataset')
  }
}

export const updateNote = async (noteId: string, reqData: updateNoteValidatorInterface) => {
  try {
    const note = await Session.query().where('note_id', noteId).first()

    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    // Update the note
    await note.merge(reqData).save()

    // Reload with relationships
    await note.load('practitioner')
    await note.load('patient')

    return sendSuccess('Note updated successfully', note)
  } catch (error: any) {
    logger.error('Error in getNoteWithChats:', error.message)
    throw new Error('error while getting note with chat')
  }
}

/** MySQL DATE() can come back as a Date or a string depending on driver config. */
const dayKeyOf = (value: unknown): string => {
  const dt = value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromISO(String(value))
  return dt.toFormat('yyyy-LL-dd')
}

export const getDashboardStatistics = async () => {
  try {
    const now = DateTime.now()
    const startOfToday = now.startOf('day').toSQL()!
    const startOfThisWeek = now.minus({ days: 7 }).startOf('day').toSQL()!
    const startOfLastWeek = now.minus({ days: 14 }).startOf('day').toSQL()!
    const startOfVolumeWindow = now.minus({ days: 6 }).startOf('day').toSQL()!
    const endOfToday = now.endOf('day').toSQL()!

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const last7Days = Array.from({ length: 7 }, (_, i) => now.minus({ days: 6 - i }))

    // Independent counts, the weekly volume, the top practitioners, and recent
    // activity all run together instead of one query per day/practitioner.
    const [
      notesAuditedTodayResult,
      activePractitionersResult,
      criticalIssuesResult,
      thisWeekResult,
      lastWeekResult,
      topPractitioners,
      volumeRows,
      recentSessions,
    ] = await Promise.all([
      db
        .from('session')
        .whereNull('deleted_at')
        .where('created_at', '>=', startOfToday)
        .count('* as total'),
      db
        .from('session')
        .whereNull('deleted_at')
        .whereNotNull('practitioner_id')
        .countDistinct('practitioner_id as total'),
      db
        .from('session')
        .whereNull('deleted_at')
        .where((builder) => {
          builder.where('ai_status', AiStatusEnum.failed).orWhere('priority', 1)
        })
        .count('* as total'),
      db
        .from('session')
        .whereNull('deleted_at')
        .where('created_at', '>=', startOfThisWeek)
        .count('* as total'),
      db
        .from('session')
        .whereNull('deleted_at')
        .where('created_at', '>=', startOfLastWeek)
        .where('created_at', '<', startOfThisWeek)
        .count('* as total'),
      // Top 4 practitioners by session volume, for the quality trends below.
      db
        .from('session')
        .whereNull('session.deleted_at')
        .join('users', 'session.practitioner_id', 'users.id')
        .select('users.id', 'users.full_name')
        .count('session.id as count')
        .groupBy('users.id', 'users.full_name')
        .orderBy('count', 'desc')
        .limit(4),
      // Weekly Audit Volume per day, aggregated in one grouped query instead of one per day.
      db
        .from('session')
        .whereNull('deleted_at')
        .where('created_at', '>=', startOfVolumeWindow)
        .where('created_at', '<=', endOfToday)
        .groupByRaw('DATE(created_at)')
        .select(
          db.raw('DATE(created_at) as day'),
          db.raw('SUM(CASE WHEN ai_status = ? THEN 1 ELSE 0 END) as critical_failures', [
            AiStatusEnum.failed,
          ]),
          db.raw('SUM(CASE WHEN ai_status = ? THEN 1 ELSE 0 END) as passed', [AiStatusEnum.passed]),
          db.raw('SUM(CASE WHEN human_review = ? THEN 1 ELSE 0 END) as practitioner_corrections', [
            HumanReviewEnum.completed,
          ]),
          db.raw('SUM(CASE WHEN human_review = ? THEN 1 ELSE 0 END) as hitl', [
            HumanReviewEnum.pending,
          ])
        ),
      // Recent Activities (last 5 sessions)
      Session.query()
        .preload('practitioner')
        .preload('patient')
        .orderBy('createdAt', 'desc')
        .limit(5),
    ])

    const notesAuditedToday = Number(notesAuditedTodayResult[0]?.total || 0)
    const activePractitioners = Number(activePractitionersResult[0]?.total || 0)
    const criticalIssues = Number(criticalIssuesResult[0]?.total || 0)
    const thisWeekCount = Number(thisWeekResult[0]?.total || 0)
    const lastWeekCount = Number(lastWeekResult[0]?.total || 0)

    let weeklyGrowth = 0
    if (lastWeekCount > 0) {
      weeklyGrowth = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
    } else if (thisWeekCount > 0) {
      weeklyGrowth = 100
    }

    const volumeByDay = new Map(volumeRows.map((row: any) => [dayKeyOf(row.day), row]))
    const weeklyAuditVolume = last7Days.map((dayDate) => {
      const row: any = volumeByDay.get(dayDate.toFormat('yyyy-LL-dd'))
      return {
        day: daysOfWeek[dayDate.weekday % 7],
        criticalFailures: Number(row?.critical_failures || 0),
        hitl: Number(row?.hitl || 0),
        passed: Number(row?.passed || 0),
        practitionerCorrections: Number(row?.practitioner_corrections || 0),
      }
    })

    // Practitioner Quality Trends: one grouped query across all top practitioners and days,
    // instead of one avg() query per practitioner per day.
    const practitionerIds = topPractitioners.map((p: any) => p.id)
    const trendRows = practitionerIds.length
      ? await db
          .from('session')
          .whereNull('deleted_at')
          .whereIn('practitioner_id', practitionerIds)
          .where('created_at', '>=', startOfVolumeWindow)
          .where('created_at', '<=', endOfToday)
          .whereNotNull('ai_score')
          .groupByRaw('practitioner_id, DATE(created_at)')
          .select(
            'practitioner_id',
            db.raw('DATE(created_at) as day'),
            db.raw('AVG(ai_score) as avg_score')
          )
      : []

    const trendByPractitionerDay = new Map(
      trendRows.map((row: any) => [`${row.practitioner_id}_${dayKeyOf(row.day)}`, row])
    )

    const practitionerTrends = topPractitioners.map((p: any) => {
      const fullName = p.full_name?.trim() || `Practitioner #${p.id}`

      const data = last7Days.map((dayDate) => {
        const row: any = trendByPractitionerDay.get(`${p.id}_${dayDate.toFormat('yyyy-LL-dd')}`)
        return {
          day: daysOfWeek[dayDate.weekday % 7],
          score: Math.round(Number(row?.avg_score || 0)),
        }
      })

      return { name: fullName, data }
    })

    const recentActivities = recentSessions.map((session) => {
      let type: 'info' | 'progress' | 'critical' | 'default' = 'default'
      if (session.aiStatus === AiStatusEnum.failed) type = 'critical'
      else if (session.aiStatus === AiStatusEnum.passed) type = 'progress'
      else if (session.humanReview === HumanReviewEnum.pending) type = 'info'

      const practitionerName = session.practitioner?.fullName || 'Practitioner'

      const dateStr = session.createdAt ? session.createdAt.toRelative() || 'Recently' : 'Recently'

      return {
        id: String(session.id),
        type,
        title: `Note #${session.noteId || session.id} ${session.aiStatus === AiStatusEnum.failed ? 'failed audit' : 'processed'}`,
        description: `Practitioner: ${practitionerName}`,
        timestamp: session.createdAt ? session.createdAt.toISO() : new Date().toISOString(),
        timeAgo: dateStr,
      }
    })

    return {
      notesAuditedToday,
      weeklyGrowth,
      activePractitioners,
      criticalIssues,
      weeklyAuditVolume,
      practitionerTrends,
      recentActivities,
    }
  } catch (error: any) {
    logger.error('Error fetching dashboard statistics', error)
    throw new Error('Error fetching dashboard statistics')
  }
}
