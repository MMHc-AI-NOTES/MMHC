import ErrorType, { errorTypeFilterEnum, errorTypeSortEnum } from '#models/error_type'
import SmeIssue from '#models/sme_issue'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import type {
  createErrorTypeValidatorInterface,
  updateErrorTypeValidatorInterface,
} from '#validators/error_type_validator'

export const listErrorTypes = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortErrorType: any
    let errorTypeListings: any = ErrorType.query()

    if (filters?.length) {
      filterData = applyFilters(errorTypeListings, filters, errorTypeFilterEnum)
      if (filterData?.status === false) {
        return {
          status: filterData.status,
          message: filterData.message,
        }
      }
      errorTypeListings = filterData?.query ?? errorTypeListings
    }

    query = errorTypeListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'asc')
    }
    if (sorts?.length) {
      sortErrorType = applySorting(query, sorts, errorTypeSortEnum)
      if (sortErrorType?.status) {
        return sortErrorType
      }
    }
    let sortQuery = sortErrorType?.query ?? query
    let errorTypeListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    return sendSuccess('Error types listed successfully', {
      count: errorTypeListingPaginated['rows'].length,
      total_count: errorTypeListingPaginated.total,
      total_page_count: errorTypeListingPaginated.lastPage,
      page: errorTypeListingPaginated.currentPage,
      page_size: errorTypeListingPaginated.perPage,
      data: errorTypeListingPaginated['rows'].map((errorType: any) => ({
        ...errorType.serialize(),
      })),
    })
  } catch (error: any) {
    console.log('Error in listErrorTypes:', error.message)
    throw new Error('Failed to retrieve error types. Please try again later.')
  }
}

export const getErrorType = async (id: number) => {
  try {
    const errorType = await ErrorType.find(id)

    if (!errorType) {
      return sendError('Error type not found')
    }

    return sendSuccess('Error type retrieved successfully', errorType)
  } catch (error: any) {
    console.log('Error in getErrorType:', error.message)
    return sendError(error.message)
  }
}

export const createErrorType = async (reqData: createErrorTypeValidatorInterface) => {
  try {
    // Check if name already exists
    const existing = await ErrorType.findBy('name', reqData.name)
    if (existing) {
      return sendError('Error type with this name already exists')
    }

    const errorType = await ErrorType.create({
      name: reqData.name,
      displayName: reqData.display_name,
      points: reqData.points,
    })

    return sendSuccess('Error type created successfully', errorType)
  } catch (error: any) {
    console.log('Error in createErrorType:', error.message)
    return sendError(error.message)
  }
}

export const updateErrorType = async (id: number, reqData: updateErrorTypeValidatorInterface) => {
  try {
    const errorType = await ErrorType.find(id)
    if (!errorType) {
      return sendError('Error type not found')
    }

    // Check if name already exists (if being updated)
    if (reqData.name && reqData.name !== errorType.name) {
      const existing = await ErrorType.findBy('name', reqData.name)
      if (existing) {
        return sendError('Error type with this name already exists')
      }
    }

    const updateData: any = {}
    if (reqData.name !== undefined) {
      updateData.name = reqData.name
    }
    if (reqData.display_name !== undefined) {
      updateData.displayName = reqData.display_name
    }
    if (reqData.points !== undefined) {
      updateData.points = reqData.points
    }

    await errorType.merge(updateData).save()

    return sendSuccess('Error type updated successfully', errorType)
  } catch (error: any) {
    console.log('Error in updateErrorType:', error.message)
    return sendError(error.message)
  }
}

export const deleteErrorType = async (id: number) => {
  try {
    const errorType = await ErrorType.find(id)
    if (!errorType) {
      return sendError('Error type not found')
    }

    // Check if error type is being used in any SME issue
    const smeIssueUsingErrorType = await SmeIssue.query().where('error_type_id', id).first()
    if (smeIssueUsingErrorType) {
      return sendError(
        'Cannot delete error type. It is already being used in SME issues and cannot be deleted.'
      )
    }

    await errorType.delete()
    return sendSuccess('Error type deleted successfully')
  } catch (error: any) {
    console.log('Error in deleteErrorType:', error.message)
    return sendError(error.message)
  }
}
