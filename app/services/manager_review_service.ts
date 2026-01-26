import ManagerReview, {
  managerReviewFilterEnum,
  managerReviewSortEnum,
} from '#models/manager_review'
import Session from '#models/session'
import HumanReview from '#models/human_review'
import User from '#models/user'
import Chat from '#models/chat'
import SmeIssue from '#models/sme_issue'
import { sendError, sendSuccess } from '#services/custom_response_service'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import type { updateManagerReviewValidatorInterface } from '#validators/manager_review_validator'
import { ManagerEnum } from '#enums/session_enum'

export const listManagerReviews = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortManagerReview: any

    let managerReviewListings: any = ManagerReview.query()
      .select('manager_reviews.*')
      .preload('manager')
      .preload('review')
      .preload('session')
      .preload('practitioner')
      .preload('reviewer')
      .preload('version')

    // Separate search and manager review filters
    let searchFilter: any = null
    let managerReviewFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else {
          managerReviewFilters.push(filter)
        }
      })
    }

    // Apply manager review filters
    if (managerReviewFilters?.length) {
      filterData = applyFilters(
        managerReviewListings,
        managerReviewFilters,
        managerReviewFilterEnum
      )
      if (filterData?.status === false) {
        return {
          status: filterData.status,
          message: filterData.message,
        }
      }
      managerReviewListings = filterData?.query ?? managerReviewListings
    }

    // Apply search filter (note_id contains, manager_id/review_id exact if numeric)
    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`
        const searchNumber = Number.parseInt(searchValue)

        managerReviewListings = managerReviewListings.where((subQuery: any) => {
          subQuery.whereILike('manager_reviews.note_id', searchPattern)

          // If numeric, search manager_id and review_id as well
          if (!Number.isNaN(searchNumber)) {
            subQuery.orWhere('manager_reviews.manager_id', searchNumber)
            subQuery.orWhere('manager_reviews.review_id', searchNumber)
          }
        })
      }
    }

    query = managerReviewListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'desc')
    }
    if (sorts?.length) {
      sortManagerReview = applySorting(query, sorts, managerReviewSortEnum)
      if (sortManagerReview?.status) {
        return sortManagerReview
      }
    }
    let sortQuery = sortManagerReview?.query ?? query
    let managerReviewListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    // Load SME issues for each manager review based on reviewer_id, note_id, and version_id
    const managerReviews = managerReviewListingPaginated['rows']
    for (const review of managerReviews) {
      if (review.reviewerId !== null && review.reviewerId !== undefined && review.noteId) {
        const smeIssuesQuery = SmeIssue.query()
          .where('reviewer_id', review.reviewerId)
          .where('note_id', review.noteId)

        if (review.versionId !== null && review.versionId !== undefined) {
          smeIssuesQuery.where('version_id', review.versionId)
        } else {
          smeIssuesQuery.whereNull('version_id')
        }

        const smeIssues = await smeIssuesQuery
          .preload('errorType')
          .preload('issuesRelatedTo')
          .preload('issueDescription')
          .preload('reviewer')

        review.$setRelated('smeIssues', smeIssues)
      } else {
        review.$setRelated('smeIssues', [])
      }
    }

    return {
      count: managerReviewListingPaginated['rows'].length,
      total_count: managerReviewListingPaginated.total,
      total_page_count: managerReviewListingPaginated.lastPage,
      page: managerReviewListingPaginated.currentPage,
      page_size: managerReviewListingPaginated.perPage,
      data: managerReviewListingPaginated['rows'].map((review: any) => ({
        ...review.serialize(),
      })),
    }
  } catch (error: any) {
    console.log('Error in listManagerReviews:', error.message)
    throw new Error('Failed to retrieve manager reviews. Please try again later.')
  }
}

export const getManagerReview = async (id: number) => {
  try {
    const review = await ManagerReview.query()
      .where('id', id)
      .select('manager_reviews.*')
      .preload('manager')
      .preload('review')
      .preload('session')
      .preload('practitioner')
      .preload('reviewer')
      .preload('version')
      .first()

    if (review) {
      // Load SME issues matching reviewer_id, note_id, and version_id
      if (review.reviewerId !== null && review.reviewerId !== undefined && review.noteId) {
        const smeIssuesQuery = SmeIssue.query()
          .where('reviewer_id', review.reviewerId)
          .where('note_id', review.noteId)

        if (review.versionId !== null && review.versionId !== undefined) {
          smeIssuesQuery.where('version_id', review.versionId)
        } else {
          smeIssuesQuery.whereNull('version_id')
        }

        const smeIssues = await smeIssuesQuery
          .preload('errorType')
          .preload('issuesRelatedTo')
          .preload('issueDescription')
          .preload('reviewer')

        review.$setRelated('smeIssues', smeIssues)
      } else {
        review.$setRelated('smeIssues', [])
      }
    }

    if (!review) {
      return sendError('Manager review not found')
    }

    // Get chat count for this note_id
    const chatCount = await Chat.query().where('note_id', review.noteId).count('* as count')
    const count = Number(chatCount[0].$extras.count) || 0

    const reviewWithCount = {
      ...review.serialize(),
      chat_count: count,
    }

    return sendSuccess('Manager review retrieved successfully', reviewWithCount)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const updateManagerReview = async (
  id: number,
  reqData: updateManagerReviewValidatorInterface
) => {
  try {
    const review = await ManagerReview.query().where('id', id).first()

    if (!review) {
      return sendError('Manager review not found')
    }

    const updatePayload: any = {}

    // Validate related entities if provided
    if (reqData.manager_id !== undefined) {
      const managerExists = await User.query().where('id', reqData.manager_id).first()
      if (!managerExists) {
        return sendError('Manager not found for the provided manager_id')
      }
      updatePayload.managerId = reqData.manager_id
    }

    if (reqData.review_id !== undefined) {
      const reviewExists = await HumanReview.query().where('id', reqData.review_id).first()
      if (!reviewExists) {
        return sendError('Human review not found for the provided review_id')
      }
      updatePayload.reviewId = reqData.review_id
    }

    if (reqData.note_id) {
      const sessionExists = await Session.query().where('note_id', reqData.note_id).first()
      if (!sessionExists) {
        return sendError('Session not found for the provided note_id')
      }
      updatePayload.noteId = reqData.note_id
    }

    if (reqData.chat_id !== undefined) {
      if (reqData.chat_id !== null) {
        const chatExists = await Chat.query().where('id', reqData.chat_id).first()
        if (!chatExists) {
          return sendError('Chat not found for the provided chat_id')
        }
      }
      updatePayload.chatId = reqData.chat_id ?? null
    }

    if (reqData.practitioner_id !== undefined) {
      const practitionerExists = await User.query().where('id', reqData.practitioner_id).first()
      if (!practitionerExists) {
        return sendError('Practitioner not found for the provided practitioner_id')
      }
      updatePayload.practitionerId = reqData.practitioner_id
    }

    if (reqData.decision !== undefined) {
      updatePayload.decision = reqData.decision
    }

    if (reqData.ai_status !== undefined) {
      updatePayload.aiStatus = reqData.ai_status ?? null
    }

    if (reqData.priority !== undefined) {
      updatePayload.priority = reqData.priority ?? null
    }

    if (reqData.manual_score !== undefined) {
      updatePayload.manualScore = reqData.manual_score ?? null
    }

    if (reqData.ai_score !== undefined) {
      updatePayload.aiScore = reqData.ai_score ?? null
    }

    if (reqData.disagreement !== undefined) {
      updatePayload.disagreement = reqData.disagreement ?? null
    }

    if (reqData.comment !== undefined) {
      updatePayload.comment = reqData.comment ?? null
    }

    if (reqData.human_result !== undefined) {
      updatePayload.humanResult = reqData.human_result ?? null
    }

    if (reqData.human_decision !== undefined) {
      updatePayload.humanDecision = reqData.human_decision ?? null
    }

    await review.merge(updatePayload).save()

    // Update note (session) manager status to completed when manager review is updated
    const session = await Session.query().where('note_id', review.noteId).first()
    if (session) {
      await session.merge({ manager: ManagerEnum.completed }).save()
    }

    await review.load('manager')
    await review.load('review')
    await review.load('session')
    if (review.chatId) {
      await review.load('chat')
    }
    await review.load('practitioner')

    return sendSuccess('Manager review updated successfully', review)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const deleteManagerReview = async (id: number) => {
  try {
    const review = await ManagerReview.query().where('id', id).first()

    if (!review) {
      return sendError('Manager review not found')
    }

    await review.delete()

    return sendSuccess('Manager review deleted successfully', { id })
  } catch (error: any) {
    return sendError(error.message)
  }
}
