import User, { userFilterEnum, userSortEnum } from '#models/user'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { UserTypeEnum } from '#enums/user_type_enum'

export const practitionerListing = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortPractitioner: any
    // Filter by practitioner type
    let practitionerListings: any = User.query().where('type', UserTypeEnum.practitioner)

    if (filters?.length) {
      filterData = applyFilters(practitionerListings, filters, userFilterEnum)
    }
    if (filterData?.status === false) {
      return {
        status: filterData.status,
        message: filterData.message,
      }
    }
    query = filterData?.query ?? practitionerListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'desc')
    }
    if (sorts?.length) {
      sortPractitioner = applySorting(query, sorts, userSortEnum)
      if (sortPractitioner?.status) {
        return sortPractitioner
      }
    }
    let sortQuery = sortPractitioner?.query ?? query
    let practitionerListingPaginated = await paginateQuery(sortQuery, pageSize, page)
    return {
      count: practitionerListingPaginated['rows'].length,
      total_count: practitionerListingPaginated.total,
      total_page_count: practitionerListingPaginated.lastPage,
      page: practitionerListingPaginated.currentPage,
      page_size: practitionerListingPaginated.perPage,
      data: practitionerListingPaginated['rows'].map((practitioner: any) => ({
        ...practitioner.serialize(),
      })),
    }
  } catch (error) {
    throw new Error(`Error retrieving practitioners: ${error.message}`)
  }
}
