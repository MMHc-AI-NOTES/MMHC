import Session, { sessionFilterEnum, sessionSortEnum } from '#models/session'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { AiStatusEnum, HumanReviewEnum, ManagerEnum, WorkflowEnum } from '#enums/session_enum'
import { DateTime } from 'luxon'

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
      .preload('chats', (chatsQuery) => chatsQuery.orderBy('id', 'desc'))
      .withCount('chats', (countQuery) => {
        countQuery.as('chat_count')
      })

    // Extract search filter if present
    let searchFilter: any = null
    let otherFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else {
          otherFilters.push(filter)
        }
      })
    }

    // Apply search filter (OR WHERE on note_id, practitioner_id, patient_id)
    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`
        const searchNumber = Number.parseInt(searchValue)

        noteListings = noteListings.where((subQuery: any) => {
          subQuery.whereILike('note_id', searchPattern)

          // If search value is a number, also search in practitioner_id and patient_id
          if (!Number.isNaN(searchNumber)) {
            subQuery.orWhere('practitioner_id', searchNumber).orWhere('patient_id', searchNumber)
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
      query = query.orderBy('id', 'desc')
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
        return {
          ...serialized,
          chat_count: note.$extras.chat_count || 0,
        }
      }),
    }
  } catch (error) {
    throw new Error(`Error retrieving notes: ${error.message}`)
  }
}

export const getNoteWithChats = async (noteId: string) => {
  try {
    const note = await Session.query()
      .where('note_id', noteId)
      .preload('practitioner')
      .preload('patient')
      .preload('chats', (chatsQuery) => chatsQuery.orderBy('id', 'desc').limit(10))
      .withCount('chats', (countQuery) => {
        countQuery.as('chat_count')
      })
      .first()

    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    const serialized = note.serialize()
    const noteWithCount = {
      ...serialized,
      chat_count: note.$extras.chat_count || 0,
    }

    return sendSuccess('Note with chats retrieved successfully', noteWithCount)
  } catch (error: any) {
    return sendError(error.message)
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
    throw new Error(`Error retrieving queue statistics: ${error.message}`)
  }
}
