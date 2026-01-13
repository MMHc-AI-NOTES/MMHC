import SmeIssue, { smeIssueFilterEnum, smeIssueSortEnum } from '#models/sme_issue'
import Session from '#models/session'
import WebhookSessionVersion from '#models/webhook_session_version'
import { sendSuccess, sendError } from '#services/custom_response_service'
import type {
  createSmeIssueValidatorInterface,
  updateSmeIssueValidatorInterface,
} from '#validators/sme_issue_validator'
import { IssueDescriptionDisplayNames } from '#enums/manual_issue_enum'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'

export const createSmeIssue = async (reqData: createSmeIssueValidatorInterface) => {
  try {
    // Verify note exists
    const note = await Session.query().where('note_id', reqData.note_id).first()

    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    // Verify version exists if version_id is provided
    if (reqData.version_id) {
      const version = await WebhookSessionVersion.query()
        .where('id', reqData.version_id)
        .where('note_id', reqData.note_id)
        .first()

      if (!version) {
        return sendError('Version not found for the provided version_id and note_id')
      }
    }

    // Convert description enum ID to text if number is provided
    let descriptionText: string
    if (typeof reqData.description === 'number') {
      descriptionText =
        IssueDescriptionDisplayNames[reqData.description] || String(reqData.description)
    } else {
      descriptionText = reqData.description
    }

    // Create SME issue
    const smeIssue = await SmeIssue.create({
      reviewerId: reqData.reviewer_id,
      errorType: reqData.error_type,
      issuesRelatedTo: reqData.issues_related_to,
      description: descriptionText,
      noteId: reqData.note_id,
      versionId: reqData.version_id ?? null,
      status: reqData.status ?? 1,
    })

    // Reload with relationships
    await smeIssue.load('reviewer')
    await smeIssue.load('note')
    if (smeIssue.versionId) {
      await smeIssue.load('version')
    }

    return sendSuccess('SME issue created successfully', smeIssue)
  } catch (error: any) {
    console.log('Error in createSmeIssue:', error.message)
    return sendError(error.message)
  }
}

export const listSmeIssues = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortSmeIssue: any

    // Separate search and SME issue filters
    let searchFilter: any = null
    let smeIssueFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else {
          smeIssueFilters.push(filter)
        }
      })
    }

    // Start with base query and add preloads
    let smeIssueListings: any = SmeIssue.query()
      .preload('reviewer')
      .preload('note')
      .preload('version')

    // Apply SME issue filters
    if (smeIssueFilters?.length) {
      filterData = applyFilters(smeIssueListings, smeIssueFilters, smeIssueFilterEnum)
      if (filterData?.status === false) {
        return {
          status: filterData.status,
          message: filterData.message,
        }
      }
      smeIssueListings = filterData?.query ?? smeIssueListings
    }

    // Apply search filter (note_id contains, reviewer_id exact if numeric)
    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`
        const searchNumber = Number.parseInt(searchValue)

        smeIssueListings = smeIssueListings.where((subQuery: any) => {
          subQuery.whereILike('sme_issues.note_id', searchPattern)

          // If numeric, search reviewer_id as well
          if (!Number.isNaN(searchNumber)) {
            subQuery.orWhere('sme_issues.reviewer_id', searchNumber)
          }
        })
      }
    }

    query = smeIssueListings
    if (!sorts?.length) {
      query = query.orderBy('sme_issues.id', 'desc')
    }
    if (sorts?.length) {
      sortSmeIssue = applySorting(query, sorts, smeIssueSortEnum)
      if (sortSmeIssue?.status) {
        return sortSmeIssue
      }
    }
    let sortQuery = sortSmeIssue?.query ?? query
    let smeIssueListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    return {
      count: smeIssueListingPaginated['rows'].length,
      total_count: smeIssueListingPaginated.total,
      total_page_count: smeIssueListingPaginated.lastPage,
      page: smeIssueListingPaginated.currentPage,
      page_size: smeIssueListingPaginated.perPage,
      data: smeIssueListingPaginated['rows'].map((issue: any) => ({
        ...issue.serialize(),
      })),
    }
  } catch (error: any) {
    console.log('Error in listSmeIssues:', error.message)
    throw new Error('Failed to retrieve SME issues. Please try again later.')
  }
}

export const getSmeIssue = async (id: number) => {
  try {
    const issue = await SmeIssue.query()
      .where('id', id)
      .preload('reviewer')
      .preload('note')
      .preload('version')
      .first()

    if (!issue) {
      return sendError('SME issue not found')
    }

    return sendSuccess('SME issue retrieved successfully', issue)
  } catch (error: any) {
    console.log('Error in getSmeIssue:', error.message)
    return sendError(error.message)
  }
}

export const updateSmeIssue = async (id: number, reqData: updateSmeIssueValidatorInterface) => {
  try {
    const issue = await SmeIssue.find(id)
    if (!issue) {
      return sendError('SME issue not found')
    }
    // Verify note exists if note_id is being updated
    if (reqData.note_id) {
      const note = await Session.query().where('note_id', reqData.note_id).first()
      if (!note) {
        return sendError('Note not found for the provided note_id')
      }
    }

    // Verify version exists if version_id is being updated
    if (reqData.version_id !== undefined && reqData.version_id !== null) {
      const version = await WebhookSessionVersion.query()
        .where('id', reqData.version_id)
        .where('note_id', reqData.note_id || issue.noteId)
        .first()

      if (!version) {
        return sendError('Version not found for the provided version_id and note_id')
      }
    }

    // Convert description enum ID to text if number is provided
    const updateData: any = { ...reqData }
    if (reqData.description !== undefined) {
      if (typeof reqData.description === 'number') {
        updateData.description =
          IssueDescriptionDisplayNames[reqData.description] || String(reqData.description)
      }
    }

    // Update the issue
    await issue.merge(updateData).save()

    // Reload with relationships
    await issue.load('reviewer')
    await issue.load('note')
    if (issue.versionId) {
      await issue.load('version')
    }

    return sendSuccess('SME issue updated successfully', issue)
  } catch (error: any) {
    console.log('Error in updateSmeIssue:', error.message)
    return sendError(error.message)
  }
}

export const deleteSmeIssue = async (id: number) => {
  try {
    const issue = await SmeIssue.find(id)
    if (!issue) {
      return sendError('SME issue not found')
    }
    await issue.delete()
    return sendSuccess('SME issue deleted successfully')
  } catch (error: any) {
    console.log('Error in deleteSmeIssue:', error.message)
    return sendError(error.message)
  }
}
