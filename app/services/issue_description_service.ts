import IssueDescription, {
  issueDescriptionFilterEnum,
  issueDescriptionSortEnum,
} from '#models/issue_description'
import SmeIssue from '#models/sme_issue'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import type {
  createIssueDescriptionValidatorInterface,
  updateIssueDescriptionValidatorInterface,
} from '#validators/issue_description_validator'
import logger from '@adonisjs/core/services/logger'

export const listIssueDescriptions = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortIssueDescription: any
    let issueDescriptionListings: any = IssueDescription.query()

    if (filters?.length) {
      filterData = applyFilters(issueDescriptionListings, filters, issueDescriptionFilterEnum)
      if (filterData?.status === false) {
        return {
          status: filterData.status,
          message: filterData.message,
        }
      }
      issueDescriptionListings = filterData?.query ?? issueDescriptionListings
    }

    query = issueDescriptionListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'asc')
    }
    if (sorts?.length) {
      sortIssueDescription = applySorting(query, sorts, issueDescriptionSortEnum)
      if (sortIssueDescription?.status) {
        return sortIssueDescription
      }
    }
    let sortQuery = sortIssueDescription?.query ?? query
    let issueDescriptionListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    return sendSuccess('Issue descriptions listed successfully', {
      count: issueDescriptionListingPaginated['rows'].length,
      total_count: issueDescriptionListingPaginated.total,
      total_page_count: issueDescriptionListingPaginated.lastPage,
      page: issueDescriptionListingPaginated.currentPage,
      page_size: issueDescriptionListingPaginated.perPage,
      data: issueDescriptionListingPaginated['rows'].map((issueDescription: any) => ({
        ...issueDescription.serialize(),
      })),
    })
  } catch (error: any) {
    logger.error('Error in listIssueDescriptions:', error.message)
    throw new Error('Failed to retrieve issue descriptions. Please try again later.')
  }
}

export const getIssueDescription = async (id: number) => {
  try {
    const issueDescription = await IssueDescription.find(id)

    if (!issueDescription) {
      return sendError('Issue description not found')
    }

    return sendSuccess('Issue description retrieved successfully', issueDescription)
  } catch (error: any) {
    logger.error('Error in getIssueDescription:', error.message)
    return sendError(error.message)
  }
}

export const createIssueDescription = async (reqData: createIssueDescriptionValidatorInterface) => {
  try {
    // Check if key already exists
    const existing = await IssueDescription.findBy('key', reqData.key)
    if (existing) {
      return sendError('Issue description with this key already exists')
    }

    const issueDescription = await IssueDescription.create({
      key: reqData.key,
      description: reqData.description,
    })

    return sendSuccess('Issue description created successfully', issueDescription)
  } catch (error: any) {
    logger.error('Error in createIssueDescription:', error.message)
    return sendError(error.message)
  }
}

export const updateIssueDescription = async (
  id: number,
  reqData: updateIssueDescriptionValidatorInterface
) => {
  try {
    const issueDescription = await IssueDescription.find(id)
    if (!issueDescription) {
      return sendError('Issue description not found')
    }

    // Check if key already exists (if being updated)
    if (reqData.key && reqData.key !== issueDescription.key) {
      const existing = await IssueDescription.findBy('key', reqData.key)
      if (existing) {
        return sendError('Issue description with this key already exists')
      }
    }

    const updateData: any = {}
    if (reqData.key !== undefined) {
      updateData.key = reqData.key
    }
    if (reqData.description !== undefined) {
      updateData.description = reqData.description
    }

    await issueDescription.merge(updateData).save()

    return sendSuccess('Issue description updated successfully', issueDescription)
  } catch (error: any) {
    logger.error('Error in updateIssueDescription:', error.message)
    return sendError(error.message)
  }
}

export const deleteIssueDescription = async (id: number) => {
  try {
    const issueDescription = await IssueDescription.find(id)
    if (!issueDescription) {
      return sendError('Issue description not found')
    }

    // Check if issue description is being used in any SME issue
    const smeIssueUsingIssueDescription = await SmeIssue.query()
      .where('issue_description_id', id)
      .first()
    if (smeIssueUsingIssueDescription) {
      return sendError(
        'Cannot delete issue description. It is already being used in SME issues and cannot be deleted.'
      )
    }

    await issueDescription.delete()
    return sendSuccess('Issue description deleted successfully')
  } catch (error: any) {
    logger.error('Error in deleteIssueDescription:', error.message)
    return sendError(error.message)
  }
}
