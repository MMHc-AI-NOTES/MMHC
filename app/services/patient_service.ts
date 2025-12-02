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

    if (filters?.length) {
      filterData = applyFilters(patientListings, filters, patientFilterEnum)
    }
    if (filterData?.status === false) {
      return {
        status: filterData.status,
        message: filterData.message,
      }
    }
    query = filterData?.query ?? patientListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'desc')
    }
    if (sorts?.length) {
      sortPatient = applySorting(query, sorts, patientSortEnum)
      if (sortPatient?.status) {
        return sortPatient
      }
    }
    let sortQuery = sortPatient?.query ?? query
    let patientListingPaginated = await paginateQuery(sortQuery, pageSize, page)
    return {
      count: patientListingPaginated['rows'].length,
      total_count: patientListingPaginated.total,
      total_page_count: patientListingPaginated.lastPage,
      page: patientListingPaginated.currentPage,
      page_size: patientListingPaginated.perPage,
      data: patientListingPaginated['rows'].map((patient: any) => ({
        ...patient.serialize(),
      })),
    }
  } catch (error) {
    throw new Error(`Error retrieving patients: ${error.message}`)
  }
}
