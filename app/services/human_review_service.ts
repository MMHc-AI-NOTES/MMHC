import HumanReview, { humanReviewFilterEnum, humanReviewSortEnum } from '#models/human_review'
import Session from '#models/session'
import { sendSuccess, sendError } from '#services/custom_response_service'
import type {
  createHumanReviewValidatorInterface,
  updateHumanReviewValidatorInterface,
} from '#validators/human_review_validator'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { HumanReviewEnum } from '#enums/session_enum'
import { ReviewCycleEnum } from '#enums/review_cycle_enum'

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
    }

    const humanReview = await HumanReview.create(humanReviewData)

    // Update note (session) with completed human review status and review cycle
    await note
      .merge({
        humanReview: HumanReviewEnum.completed,
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
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortHumanReview: any

    let humanReviewListings: any = HumanReview.query()
      .preload('practitioner')
      .preload('note')
      .preload('chat')

    if (filters?.length) {
      filterData = applyFilters(humanReviewListings, filters, humanReviewFilterEnum)
    }
    if (filterData?.status === false) {
      return {
        status: filterData.status,
        message: filterData.message,
      }
    }
    query = filterData?.query ?? humanReviewListings
    if (!sorts?.length) {
      query = query.orderBy('id', 'desc')
    }
    if (sorts?.length) {
      sortHumanReview = applySorting(query, sorts, humanReviewSortEnum)
      if (sortHumanReview?.status) {
        return sortHumanReview
      }
    }
    let sortQuery = sortHumanReview?.query ?? query
    let humanReviewListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    return {
      count: humanReviewListingPaginated['rows'].length,
      total_count: humanReviewListingPaginated.total,
      total_page_count: humanReviewListingPaginated.lastPage,
      page: humanReviewListingPaginated.currentPage,
      page_size: humanReviewListingPaginated.perPage,
      data: humanReviewListingPaginated['rows'].map((review: any) => ({
        ...review.serialize(),
      })),
    }
  } catch (error: any) {
    console.log('Error in listHumanReviews:', error.message)
    throw new Error('Failed to retrieve human reviews. Please try again later.')
  }
}

export const getHumanReview = async (id: number) => {
  try {
    const review = await HumanReview.query()
      .where('id', id)
      .preload('practitioner')
      .preload('note')
      .preload('chat')
      .first()

    if (!review) {
      return sendError('Human review not found')
    }

    return sendSuccess('Human review retrieved successfully', review)
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

    if (reqData.chat_id !== undefined) {
      updatePayload.chatId = reqData.chat_id ?? null
    }

    if (reqData.manual_score !== undefined) {
      updatePayload.manualScore = reqData.manual_score ?? null
    }

    if (reqData.comment !== undefined) {
      updatePayload.comment = reqData.comment ?? null
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
