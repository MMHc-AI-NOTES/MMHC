import Patient, { patientFilterEnum, patientSortEnum } from '#models/patient'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'

export const patientListing = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortPatient: any
    let patientListings: any = Patient.query()
      .withCount('sessions', (countQuery) => {
        countQuery.as('note_count')
      })
      .preload('sessions', (sessionsQuery) => {
        sessionsQuery.orderBy('session_time', 'desc')
      })

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

    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`
        const maybeId = Number.parseInt(searchValue, 10)

        patientListings = patientListings.where((subQuery: any) => {
          subQuery.whereILike('client_id', searchPattern)
          if (!Number.isNaN(maybeId)) {
            subQuery.orWhere('id', maybeId)
          }
        })
      }
    }

    if (otherFilters?.length) {
      filterData = applyFilters(patientListings, otherFilters, patientFilterEnum)
    }
    if (filterData?.status === false) {
      return {
        status: filterData.status,
        message: filterData.message,
      }
    }
    query = filterData?.query ?? patientListings
    // Sorting
    let noteCountSort: any = null
    let otherSorts: Array<any> = []

    if (sorts?.length) {
      sorts.forEach((sort) => {
        if (sort.columnName === 'note_count') {
          noteCountSort = sort
        } else {
          otherSorts.push(sort)
        }
      })
    }

    if (otherSorts.length) {
      sortPatient = applySorting(query, otherSorts, patientSortEnum)
      if (sortPatient?.status) {
        return sortPatient
      }
    }

    let sortQuery = sortPatient?.query ?? query

    if (
      noteCountSort &&
      noteCountSort.orderBy &&
      (noteCountSort.orderBy === 'asc' || noteCountSort.orderBy === 'desc')
    ) {
      // note_count is an alias from withCount, so we sort directly on it
      sortQuery = sortQuery.orderBy('note_count', noteCountSort.orderBy)
    }
    let patientListingPaginated = await paginateQuery(sortQuery, pageSize, page)
    return {
      count: patientListingPaginated['rows'].length,
      total_count: patientListingPaginated.total,
      total_page_count: patientListingPaginated.lastPage,
      page: patientListingPaginated.currentPage,
      page_size: patientListingPaginated.perPage,
      data: patientListingPaginated['rows'].map((patient: any) => {
        const serialized = patient.serialize()
        return {
          ...serialized,
          note_count: patient.$extras?.note_count || 0,
        }
      }),
    }
  } catch (error) {
    throw new Error(`Error retrieving patients listings`)
  }
}
