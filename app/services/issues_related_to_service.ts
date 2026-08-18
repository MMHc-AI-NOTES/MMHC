import IssuesRelatedTo, {
  issuesRelatedToFilterEnum,
  issuesRelatedToSortEnum,
} from '#models/issues_related_to'
import SmeIssue from '#models/sme_issue'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateConfigQuery } from '#services/apply_pagination'
import type {
  createIssuesRelatedToValidatorInterface,
  updateIssuesRelatedToValidatorInterface,
} from '#validators/issues_related_to_validator'
import logger from '@adonisjs/core/services/logger'

export const listIssuesRelatedTo = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortIssuesRelatedTo: any
    let issuesRelatedToListings: any = IssuesRelatedTo.query()

    if (filters?.length) {
      filterData = applyFilters(issuesRelatedToListings, filters, issuesRelatedToFilterEnum)
      if (filterData?.status === false) {
        return {
          status: filterData.status,
          message: filterData.message,
        }
      }
      issuesRelatedToListings = filterData?.query ?? issuesRelatedToListings
    }

    query = issuesRelatedToListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'asc')
    }
    if (sorts?.length) {
      sortIssuesRelatedTo = applySorting(query, sorts, issuesRelatedToSortEnum)
      if (sortIssuesRelatedTo?.status) {
        return sortIssuesRelatedTo
      }
    }
    let sortQuery = sortIssuesRelatedTo?.query ?? query
    let issuesRelatedToListingPaginated = await paginateConfigQuery(sortQuery, pageSize, page)

    return sendSuccess('Issues related to listed successfully', {
      count: issuesRelatedToListingPaginated['rows'].length,
      total_count: issuesRelatedToListingPaginated.total,
      total_page_count: issuesRelatedToListingPaginated.lastPage,
      page: issuesRelatedToListingPaginated.currentPage,
      page_size: issuesRelatedToListingPaginated.perPage,
      data: issuesRelatedToListingPaginated['rows'].map((issueRelatedTo: any) => ({
        ...issueRelatedTo.serialize(),
      })),
    })
  } catch (error: any) {
    logger.error('Error in listIssuesRelatedTo:', error.message)
    throw new Error('Failed to retrieve issues related to. Please try again later.')
  }
}

export const getIssuesRelatedTo = async (id: number) => {
  try {
    const issuesRelatedTo = await IssuesRelatedTo.find(id)

    if (!issuesRelatedTo) {
      return sendError('Issues related to not found')
    }

    return sendSuccess('Issues related to retrieved successfully', issuesRelatedTo)
  } catch (error: any) {
    logger.error('Error in getIssuesRelatedTo:', error.message)
    return sendError(error.message)
  }
}

export const createIssuesRelatedTo = async (reqData: createIssuesRelatedToValidatorInterface) => {
  try {
    // Check if field_id already exists
    const existing = await IssuesRelatedTo.findBy('fieldId', reqData.field_id)
    if (existing) {
      return sendError('Issues related to with this field_id already exists')
    }

    const issuesRelatedTo = await IssuesRelatedTo.create({
      fieldId: reqData.field_id,
      displayName: reqData.display_name,
      noteType: reqData.note_type ?? null,
    })

    return sendSuccess('Issues related to created successfully', issuesRelatedTo)
  } catch (error: any) {
    logger.error('Error in createIssuesRelatedTo:', error.message)
    return sendError(error.message)
  }
}

export const updateIssuesRelatedTo = async (
  id: number,
  reqData: updateIssuesRelatedToValidatorInterface
) => {
  try {
    const issuesRelatedTo = await IssuesRelatedTo.find(id)
    if (!issuesRelatedTo) {
      return sendError('Issues related to not found')
    }

    // Check if field_id already exists (if being updated)
    if (reqData.field_id && reqData.field_id !== issuesRelatedTo.fieldId) {
      const existing = await IssuesRelatedTo.findBy('fieldId', reqData.field_id)
      if (existing) {
        return sendError('Issues related to with this field_id already exists')
      }
    }

    const updateData: any = {}
    if (reqData.field_id !== undefined) {
      updateData.fieldId = reqData.field_id
    }
    if (reqData.display_name !== undefined) {
      updateData.displayName = reqData.display_name
    }
    if (reqData.note_type !== undefined) {
      updateData.noteType = reqData.note_type
    }

    await issuesRelatedTo.merge(updateData).save()

    return sendSuccess('Issues related to updated successfully', issuesRelatedTo)
  } catch (error: any) {
    logger.error('Error in updateIssuesRelatedTo:', error.message)
    return sendError(error.message)
  }
}

export const deleteIssuesRelatedTo = async (id: number) => {
  try {
    const issuesRelatedTo = await IssuesRelatedTo.find(id)
    if (!issuesRelatedTo) {
      return sendError('Issues related to not found')
    }

    // Check if issues related to is being used in any SME issue
    const smeIssueUsingIssuesRelatedTo = await SmeIssue.query()
      .where('issues_related_to_id', id)
      .first()
    if (smeIssueUsingIssuesRelatedTo) {
      return sendError(
        'Cannot delete issues related to. It is already being used in SME issues and cannot be deleted.'
      )
    }

    await issuesRelatedTo.delete()
    return sendSuccess('Issues related to deleted successfully')
  } catch (error: any) {
    logger.error('Error in deleteIssuesRelatedTo:', error.message)
    return sendError(error.message)
  }
}
