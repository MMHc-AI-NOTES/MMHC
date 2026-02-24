import Session, { sessionFilterEnum, sessionSortEnum } from '#models/session'
import User from '#models/user'
import Patient from '#models/patient'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { AiStatusEnum, HumanReviewEnum, ManagerEnum, WorkflowEnum } from '#enums/session_enum'
import { UserTypeEnum } from '#enums/user_type_enum'
import { DateTime } from 'luxon'
import Chat from '#models/chat'
import type { updateNoteValidatorInterface } from '#validators/note_validator'

/**
 * Serialize a note with nested children for listing.
 * Child notes don't include previous_note (parent) since parent is already in tree above.
 */
const serializeNoteWithChildren = (note: any, isChild = false): any => {
  const serialized = note.serialize()
  const isCurrentNote = serialized.parent_note_id === null
  const previousNote = isChild
    ? null
    : note.parentNote
      ? { id: note.parentNote.id, note_id: note.parentNote.noteId }
      : null
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
      addReviewer(issue.reviewer_id, issue.reviewer)
    })
  })

  return Array.from(reviewersMap.values())
}

export const noteListing = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortNote: any

    let noteListings: any = Session.query()
      .preload('practitioner')
      .preload('patient')
      .preload('parentNote')
      // Preload direct child (if any). We only care about the first-level child for listing.
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

    let searchFilter: any = null
    let notReviewedByUserIdFilter: any = null
    let otherFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else if (filter.columnName === 'not_reviewed_by_user_id') {
          notReviewedByUserIdFilter = filter
        } else {
          otherFilters.push(filter)
        }
      })
    }

    // Handle filter for notes not reviewed by a specific user
    if (notReviewedByUserIdFilter && notReviewedByUserIdFilter.value) {
      const userId = Number.parseInt(String(notReviewedByUserIdFilter.value))
      if (!Number.isNaN(userId)) {
        noteListings = noteListings.whereNotExists((subQuery: any) => {
          subQuery
            .from('sme_issues')
            .whereRaw('sme_issues.note_id = session.note_id')
            .where('sme_issues.reviewer_id', userId)
            .whereNull('sme_issues.deleted_at')
        })
      }
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
    if (!sorts?.length) {
      // Default: latest note first (per client chain) by session_time
      query = query.orderBy('session_time', 'desc').orderBy('id', 'desc')
    }
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
        const isCurrentNote = serialized.parent_note_id === null

        const previousNote = note.parentNote
          ? {
              id: note.parentNote.id,
              note_id: note.parentNote.noteId,
            }
          : null

        const child = (note.childNotes || [])[0]
        const childNote = child
          ? {
              id: child.id,
              note_id: child.noteId,
              parent_note_id: child.parentNoteId,
            }
          : null

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
    console.log('Error in noteListing:', error.message)
    throw new Error('Failed to retrieve notes. Please try again later.')
  }
}

export const getNoteWithChats = async (noteId: string) => {
  try {
    const note = await Session.query()
      .where('note_id', noteId)
      .preload('practitioner')
      .preload('patient')
      .preload('childNotes')
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
      console.log('Error in getNoteWithChats: Note not found for note_id:', noteId)
      throw new Error('Note not found for the provided note ID')
    }

    const serialized = note.serialize()
    const isCurrentNote = serialized.parent_note_id === null
    const previousNote = note.parentNote
      ? { id: note.parentNote.id, note_id: note.parentNote.noteId }
      : null
    const child = (note.childNotes || [])[0]
    const childNote = child
      ? { id: child.id, note_id: child.noteId, parent_note_id: child.parentNoteId }
      : null
    const noteWithCount = {
      ...serialized,
      is_current_note: isCurrentNote,
      previous_note: previousNote,
      child_note: childNote,
      chat_count: note.$extras.chat_count || 0,
      version_count: note.$extras.version_count || 0,
      reviewers: extractReviewers(serialized),
    }

    return sendSuccess('Note with chats retrieved successfully', noteWithCount)
  } catch (error: any) {
    console.log('error while getting note with chat', error.message)
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
    console.log('Error in getNoteWithChats:', error.message)
    throw new Error('error while getting note with chat')
  }
}
