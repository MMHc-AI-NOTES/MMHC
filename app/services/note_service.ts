import Session, { sessionFilterEnum, sessionSortEnum } from '#models/session'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess, sendError } from '#services/custom_response_service'

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
      .preload('chats', (chatsQuery) => chatsQuery.orderBy('id', 'desc'))

    if (filters?.length) {
      filterData = applyFilters(noteListings, filters, sessionFilterEnum)
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
      data: noteListingPaginated['rows'].map((note: any) => ({
        ...note.serialize(),
      })),
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
      .preload('chats', (chatsQuery) => chatsQuery.orderBy('id', 'desc').limit(10))
      .first()

    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    return sendSuccess('Note with chats retrieved successfully', note)
  } catch (error: any) {
    return sendError(error.message)
  }
}
