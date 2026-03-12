import HumanReview, { humanReviewFilterEnum, humanReviewSortEnum } from '#models/human_review'
import SmeIssue from '#models/sme_issue'
import ManagerReview from '#models/manager_review'
import Session from '#models/session'
import User from '#models/user'
import { sendSuccess, sendError } from '#services/custom_response_service'
import type {
  createHumanReviewValidatorInterface,
  updateHumanReviewValidatorInterface,
} from '#validators/human_review_validator'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { HumanReviewEnum, ManagerEnum } from '#enums/session_enum'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'
import { UserTypeEnum } from '#enums/user_type_enum'
import { DisagreementLevelEnum } from '#enums/disagreement_enum'
import { ErrorTypePoints } from '#enums/manual_issue_enum'

export const createHumanReview = async (reqData: createHumanReviewValidatorInterface) => {
  try {
    // Verify note exists
    const note = await Session.query().where('note_id', reqData.note_id).first()

    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    // Create human review
    const humanReviewData = {
      noteId: reqData.note_id,
      practitionerId: reqData.practitioner_id,
      decision: reqData.decision,
      chatId: reqData.chat_id ?? null,
      manualScore: reqData.manual_score ?? null,
      comment: reqData.comment ?? null,
      aiStatus: reqData.ai_status ?? null,
      priority: reqData.priority ?? null,
      humanResult: reqData.human_result ?? null,
    }

    const humanReview = await HumanReview.create(humanReviewData)

    // Find superadmin user (manager) - for now using superAdmin type, in future will be based on user type
    const manager = await User.query().where('type', UserTypeEnum.superAdmin).first()

    if (manager) {
      // Create manager review entry
      await ManagerReview.create({
        managerId: manager.id,
        reviewId: humanReview.id,
        noteId: reqData.note_id,
        chatId: reqData.chat_id ?? null,
        decision: reqData.decision,
        practitionerId: reqData.practitioner_id,
        manualScore: reqData.manual_score ?? null,
        aiScore: note.aiScore ?? null,
        disagreement: DisagreementLevelEnum.none,
        aiStatus: reqData.ai_status ?? null,
        priority: reqData.priority ?? null,
        humanResult: reqData.human_result ?? null,
        humanDecision: reqData.decision ?? null,
      })
    }

    // Update note (session) with completed human review status, in_progress manager status, and review cycle
    await note
      .merge({
        humanReview: HumanReviewEnum.completed,
        manager: ManagerEnum.in_progress,
        reviewCycle: ReviewCycleEnum.cycle_2_of_3_therapist_revision,
      })
      .save()

    // Reload with relationships
    await humanReview.load('practitioner')
    await humanReview.load('note')
    if (humanReview.chatId) {
      await humanReview.load('chat')
    }

    return sendSuccess('Human review created successfully', humanReview)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const listHumanReviews = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>,
  currentUserId?: number,
  currentUserType?: number
) => {
  try {
    let query: any
    let filterData: any
    let sortHumanReview: any

    // Separate search and human review filters
    let searchFilter: any = null
    let humanReviewFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else {
          humanReviewFilters.push(filter)
        }
      })
    }

    // Start with base query and add preloads
    let humanReviewListings: any = HumanReview.query()
      .preload('practitioner')
      .preload('reviewer')
      .preload('note')
      .preload('chat')

    // If current user is not super admin, filter by reviewer_id matching current user's ID
    if (currentUserType !== UserTypeEnum.superAdmin && currentUserId) {
      humanReviewListings = humanReviewListings.where('reviewer_id', currentUserId)
    }

    // Apply human review filters
    if (humanReviewFilters?.length) {
      filterData = applyFilters(humanReviewListings, humanReviewFilters, humanReviewFilterEnum)
      if (filterData?.status === false) {
        return {
          status: filterData.status,
          message: filterData.message,
        }
      }
      humanReviewListings = filterData?.query ?? humanReviewListings
    }

    // Apply search filter:
    // - note_id contains search text
    // - practitioner_id exact if numeric
    // - practitioner full_name contains search text
    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`
        const searchNumber = Number.parseInt(searchValue)

        humanReviewListings = humanReviewListings
          .where((subQuery: any) => {
            subQuery.whereILike('human_reviews.note_id', searchPattern)

            // If numeric, search practitioner_id as well
            if (!Number.isNaN(searchNumber)) {
              subQuery.orWhere('human_reviews.practitioner_id', searchNumber)
            }
          })
          .orWhereHas('practitioner', (practitionerQuery: any) => {
            practitionerQuery.whereILike('full_name', searchPattern)
          })
      }
    }

    query = humanReviewListings
    if (!sorts?.length) {
      query = query.orderBy('human_reviews.id', 'desc')
    }
    if (sorts?.length) {
      sortHumanReview = applySorting(query, sorts, humanReviewSortEnum)
      if (sortHumanReview?.status) {
        return sortHumanReview
      }
    }
    let sortQuery = sortHumanReview?.query ?? query
    let humanReviewListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    const rows = humanReviewListingPaginated['rows']

    // Compute human_review_score: note + version ke SME issues se score. 1→5, 2→15, 3→25; score = 100 - sum
    const dataWithScores = []
    for (const review of rows) {
      const serialized = review.serialize()
      let totalPoints = 0

      if (serialized.noteId) {
        const issuesQuery = SmeIssue.query().where('note_id', serialized.noteId)
        if (serialized.versionId !== null && serialized.versionId !== undefined) {
          issuesQuery.where('version_id', serialized.versionId)
        } else {
          issuesQuery.whereNull('version_id')
        }
        const issues = await issuesQuery
        for (const issue of issues) {
          totalPoints += ErrorTypePoints[issue.errorTypeId] ?? 0
        }
      }

      let humanReviewScore = 100 - totalPoints
      if (humanReviewScore < 0) humanReviewScore = 0

      dataWithScores.push({
        ...serialized,
        human_review_score: humanReviewScore,
      })
    }

    return {
      count: rows.length,
      total_count: humanReviewListingPaginated.total,
      total_page_count: humanReviewListingPaginated.lastPage,
      page: humanReviewListingPaginated.currentPage,
      page_size: humanReviewListingPaginated.perPage,
      data: dataWithScores,
    }
  } catch (error: any) {
    console.log('Error in listHumanReviews:', error.message)
    throw new Error('Failed to retrieve human reviews. Please try again later.')
  }
}

export const getHumanReview = async (
  id: number,
  currentUserId?: number,
  currentUserType?: number
) => {
  try {
    let query = HumanReview.query()
      .where('id', id)
      .preload('practitioner')
      .preload('reviewer')
      .preload('note')
      .preload('chat')

    // If current user is not super admin, filter by reviewer_id matching current user's ID
    if (currentUserType !== UserTypeEnum.superAdmin && currentUserId) {
      query = query.where('reviewer_id', currentUserId)
    }

    const review = await query.first()

    if (!review) {
      return sendError('Human review not found')
    }

    const serialized = review.serialize()

    // Note + version ke SME issues se score: 1→5, 2→15, 3→25; score = 100 - sum
    let totalPoints = 0
    if (serialized.noteId) {
      const issuesQuery = SmeIssue.query().where('note_id', serialized.noteId)
      if (serialized.versionId !== null && serialized.versionId !== undefined) {
        issuesQuery.where('version_id', serialized.versionId)
      } else {
        issuesQuery.whereNull('version_id')
      }
      const issues = await issuesQuery
      for (const issue of issues) {
        totalPoints += ErrorTypePoints[issue.errorTypeId] ?? 0
      }
    }

    let humanReviewScore = 100 - totalPoints
    if (humanReviewScore < 0) humanReviewScore = 0

    return sendSuccess('Human review retrieved successfully', {
      ...serialized,
      human_review_score: humanReviewScore,
    })
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const updateHumanReview = async (
  id: number,
  reqData: updateHumanReviewValidatorInterface
) => {
  try {
    const review = await HumanReview.query().where('id', id).first()

    if (!review) {
      return sendError('Human review not found')
    }

    const updatePayload: any = {}

    // Validate related entities if provided
    if (reqData.note_id) {
      const noteExists = await Session.query().where('note_id', reqData.note_id).first()
      if (!noteExists) {
        return sendError('Note not found for the provided note_id')
      }
      updatePayload.noteId = reqData.note_id
    }

    if (reqData.practitioner_id !== undefined) {
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

    if (reqData.chat_id !== undefined) {
      updatePayload.chatId = reqData.chat_id ?? null
    }

    if (reqData.manual_score !== undefined) {
      updatePayload.manualScore = reqData.manual_score ?? null
    }

    if (reqData.comment !== undefined) {
      updatePayload.comment = reqData.comment ?? null
    }

    if (reqData.human_result !== undefined) {
      updatePayload.humanResult = reqData.human_result ?? null
    }

    await review.merge(updatePayload).save()

    await review.load('practitioner')
    await review.load('note')
    if (review.chatId) {
      await review.load('chat')
    }

    return sendSuccess('Human review updated successfully', review)
  } catch (error: any) {
    return sendError(error.message)
  }
}

export const deleteHumanReview = async (id: number) => {
  try {
    const review = await HumanReview.query().where('id', id).first()

    if (!review) {
      return sendError('Human review not found')
    }

    await review.delete()

    return sendSuccess('Human review deleted successfully', { id })
  } catch (error: any) {
    return sendError(error.message)
  }
}
