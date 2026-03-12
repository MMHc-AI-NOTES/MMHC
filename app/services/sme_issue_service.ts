import SmeIssue, { smeIssueFilterEnum, smeIssueSortEnum } from '#models/sme_issue'
import Session from '#models/session'
import WebhookSessionVersion from '#models/webhook_session_version'
import ErrorType from '#models/error_type'
import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import User from '#models/user'
import HumanReview from '#models/human_review'
import ManagerReview from '#models/manager_review'
import { sendSuccess, sendError } from '#services/custom_response_service'
import type {
  createSmeIssueValidatorInterface,
  updateSmeIssueValidatorInterface,
  assignSmeIssueToManagerValidatorInterface,
} from '#validators/sme_issue_validator'
import { applyFilters } from '#services/apply_filter'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { HumanReviewDecisionEnum } from '#enums/human_review_enum'

export const createSmeIssue = async (reqData: createSmeIssueValidatorInterface) => {
  try {
    // Resolve error_type_id, issues_related_to_id and issue_description_id
    // Either from template_id (preferred) or directly from payload
    let errorTypeId = reqData.error_type_id
    let issuesRelatedToId = reqData.issues_related_to_id
    let issueDescriptionId = reqData.issue_description_id ?? null

    if (reqData.template_id) {
      const template = await SmeIssuesTamplate.find(reqData.template_id)
      if (!template) {
        return sendError('Template not found for the provided template_id')
      }

      errorTypeId = template.errorTypeId
      issuesRelatedToId = template.issuesRelatedToId
      issueDescriptionId = template.issueDescriptionId
    }

    // Ensure we have required IDs either from template or payload
    if (!errorTypeId || !issuesRelatedToId) {
      return sendError(
        'Either template_id or both error_type_id and issues_related_to_id must be provided'
      )
    }

    const errorType = await ErrorType.find(errorTypeId)
    if (!errorType) {
      return sendError('Error type not found for the provided error_type_id')
    }

    const issuesRelatedTo = await IssuesRelatedTo.find(issuesRelatedToId)
    if (!issuesRelatedTo) {
      return sendError('Issues related to not found for the provided issues_related_to_id')
    }

    if (issueDescriptionId) {
      const issueDescription = await IssueDescription.find(issueDescriptionId)
      if (!issueDescription) {
        return sendError('Issue description not found for the provided issue_description_id')
      }
    }

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

    // Use practitioner_id if provided, otherwise use reviewer_id
    const practitionerId = reqData.practitioner_id ?? reqData.reviewer_id

    // Create SME issue
    const smeIssue = await SmeIssue.create({
      reviewerId: reqData.reviewer_id,
      errorTypeId: errorTypeId,
      issuesRelatedToId: issuesRelatedToId,
      issueDescriptionId: issueDescriptionId,
      noteId: reqData.note_id,
      versionId: reqData.version_id ?? null,
      status: reqData.status ?? 1,
      comment: reqData.comment ?? null,
    })

    // Get ai_status and priority from note (session)
    const aiStatus = note.aiStatus ?? null
    const priority = note.priority ?? null

    const humanReviewData = {
      noteId: reqData.note_id,
      practitionerId: practitionerId,
      reviewerId: reqData.reviewer_id,
      versionId: reqData.version_id ?? null,
      decision: HumanReviewDecisionEnum.accept_ai_evaluation, // Default decision
      aiStatus: aiStatus, // From note (session)
      priority: priority, // From note (session)
    }

    // If is_current_version is true, update existing human review entry
    if (reqData.is_current_version === true) {
      // Check if human review entry exists for this note_id and practitioner_id
      const existingHumanReview = await HumanReview.query()
        .where('note_id', reqData.note_id)
        .where('reviewer_id', reqData.reviewer_id)
        .first()

      if (existingHumanReview) {
        // Update existing human review
        await existingHumanReview.merge(humanReviewData).save()
      } else {
        // Create new human review if not exists
        await HumanReview.create(humanReviewData)
      }
    }

    // Reload with relationships
    await smeIssue.load('reviewer')
    await smeIssue.load('note')
    await smeIssue.load('errorType')
    await smeIssue.load('issuesRelatedTo')
    if (smeIssue.issueDescriptionId) {
      await smeIssue.load('issueDescription')
    }
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
      .preload('errorType')
      .preload('issuesRelatedTo')
      .preload('issueDescription')

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
      .preload('errorType')
      .preload('issuesRelatedTo')
      .preload('issueDescription')
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

    // If template_id is provided, resolve IDs from template
    if (reqData.template_id) {
      const template = await SmeIssuesTamplate.find(reqData.template_id)
      if (!template) {
        return sendError('Template not found for the provided template_id')
      }

      reqData.error_type_id = template.errorTypeId
      reqData.issues_related_to_id = template.issuesRelatedToId
      reqData.issue_description_id = template.issueDescriptionId ?? undefined
    }

    // Verify error_type_id exists if being updated
    if (reqData.error_type_id) {
      const errorType = await ErrorType.find(reqData.error_type_id)
      if (!errorType) {
        return sendError('Error type not found for the provided error_type_id')
      }
    }

    // Verify issues_related_to_id exists if being updated
    if (reqData.issues_related_to_id) {
      const issuesRelatedTo = await IssuesRelatedTo.find(reqData.issues_related_to_id)
      if (!issuesRelatedTo) {
        return sendError('Issues related to not found for the provided issues_related_to_id')
      }
    }

    // Verify issue_description_id exists if being updated
    if (reqData.issue_description_id) {
      const issueDescription = await IssueDescription.find(reqData.issue_description_id)
      if (!issueDescription) {
        return sendError('Issue description not found for the provided issue_description_id')
      }
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

    const updateData: any = { ...reqData }

    if (reqData.error_type_id !== undefined) {
      updateData.errorTypeId = reqData.error_type_id
      delete updateData.error_type_id
    }
    if (reqData.issues_related_to_id !== undefined) {
      updateData.issuesRelatedToId = reqData.issues_related_to_id
      delete updateData.issues_related_to_id
    }
    if (reqData.issue_description_id !== undefined) {
      updateData.issueDescriptionId = reqData.issue_description_id
      delete updateData.issue_description_id
    }
    if (reqData.note_id !== undefined) {
      updateData.noteId = reqData.note_id
      delete updateData.note_id
    }
    if (reqData.version_id !== undefined) {
      updateData.versionId = reqData.version_id
      delete updateData.version_id
    }
    if (reqData.reviewer_id !== undefined) {
      updateData.reviewerId = reqData.reviewer_id
      delete updateData.reviewer_id
    }
    if (reqData.comment !== undefined) {
      updateData.comment = reqData.comment
    }

    // Remove fields that don't exist on SmeIssue model
    delete updateData.template_id
    // Remove is_current_version from updateData as it's not a field in SmeIssue model
    delete updateData.is_current_version
    delete updateData.practitioner_id

    // Update the issue
    await issue.merge(updateData).save()

    // Handle human review update if is_current_version is true
    if (reqData.is_current_version === true) {
      // Get the note (session) to get ai_status and priority
      const note = await Session.query()
        .where('note_id', reqData.note_id || issue.noteId)
        .first()

      if (note) {
        // Use practitioner_id if provided, otherwise use reviewer_id from request or existing issue
        const practitionerId = reqData.practitioner_id ?? reqData.reviewer_id ?? issue.reviewerId

        // Get ai_status and priority from note (session)
        const aiStatus = note.aiStatus ?? null
        const priority = note.priority ?? null

        const humanReviewData = {
          noteId: reqData.note_id || issue.noteId,
          practitionerId: practitionerId,
          reviewerId: reqData.reviewer_id ?? issue.reviewerId,
          versionId: reqData.version_id !== undefined ? reqData.version_id : issue.versionId,
          decision: HumanReviewDecisionEnum.accept_ai_evaluation, // Default decision
          aiStatus: aiStatus, // From note (session)
          priority: priority, // From note (session)
        }

        // Check if human review entry exists for this note_id and practitioner_id
        const existingHumanReview = await HumanReview.query()
          .where('note_id', humanReviewData.noteId)
          .where('practitioner_id', practitionerId)
          .first()

        if (existingHumanReview) {
          // Update existing human review
          await existingHumanReview.merge(humanReviewData).save()
        } else {
          // Create new human review if not exists
          await HumanReview.create(humanReviewData)
        }
      }
    }

    // Reload with relationships
    await issue.load('reviewer')
    await issue.load('note')
    await issue.load('errorType')
    await issue.load('issuesRelatedTo')
    if (issue.issueDescriptionId) {
      await issue.load('issueDescription')
    }
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

export const deleteSmeIssuesByNoteAndVersion = async (
  noteId: string,
  versionId: number,
  reviewerId: number
) => {
  try {
    const note = await Session.query().where('note_id', noteId).first()
    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    const version = await WebhookSessionVersion.query()
      .where('id', versionId)
      .where('note_id', noteId)
      .first()

    if (!version) {
      return sendError('Version not found for the provided version_id and note_id')
    }

    const reviewer = await User.find(reviewerId)
    if (!reviewer) {
      return sendError('Reviewer not found for the provided reviewer_id')
    }

    const issuesToDelete = await SmeIssue.query()
      .where('note_id', noteId)
      .andWhere('version_id', versionId)
      .andWhere('reviewer_id', reviewerId)
    const count = issuesToDelete.length

    if (count === 0) {
      return sendSuccess('No SME issues found to delete', { deleted_count: 0 })
    }

    await SmeIssue.query()
      .where('note_id', noteId)
      .where('version_id', versionId)
      .where('reviewer_id', reviewerId)
      .delete()

    return sendSuccess('SME issues deleted successfully', {
      deleted_count: count,
      note_id: noteId,
      version_id: versionId,
      reviewer_id: reviewerId,
    })
  } catch (error: any) {
    console.log('Error in deleteSmeIssuesByNoteAndVersion:', error.message)
    return sendError(error.message)
  }
}

export const assignSmeIssueToManager = async (
  reqData: assignSmeIssueToManagerValidatorInterface,
  managerId: number
) => {
  try {
    // Verify note exists
    const note = await Session.query().where('note_id', reqData.note_id).first()
    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    // Verify practitioner exists
    const practitioner = await User.find(reqData.practitioner_id)
    if (!practitioner) {
      return sendError('Practitioner not found for the provided practitioner_id')
    }

    // Verify reviewer exists
    const reviewer = await User.find(reqData.reviewer_id)
    if (!reviewer) {
      return sendError('Reviewer not found for the provided reviewer_id')
    }

    // Verify manager exists
    const manager = await User.find(managerId)
    if (!manager) {
      return sendError('Manager not found')
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

    // Find or create human review entry
    let humanReview = await HumanReview.query()
      .where('note_id', reqData.note_id)
      .where('practitioner_id', reqData.practitioner_id)
      .where('reviewer_id', reqData.reviewer_id)
      .first()

    if (!humanReview) {
      // Create new human review if not exists
      humanReview = await HumanReview.create({
        noteId: reqData.note_id,
        practitionerId: reqData.practitioner_id,
        reviewerId: reqData.reviewer_id,
        versionId: reqData.version_id ?? null,
        decision:
          reqData.human_decision !== null && reqData.human_decision !== undefined
            ? reqData.human_decision
            : HumanReviewDecisionEnum.accept_ai_evaluation,
        aiStatus: note.aiStatus ?? null,
        priority: reqData.priority ?? note.priority ?? null,
      })
    } else {
      // Update existing human review
      await humanReview
        .merge({
          decision:
            reqData.human_decision !== null && reqData.human_decision !== undefined
              ? reqData.human_decision
              : humanReview.decision,
          priority: reqData.priority ?? humanReview.priority,
          versionId: reqData.version_id ?? humanReview.versionId,
        })
        .save()
    }

    // Check if manager review already exists
    let managerReview = await ManagerReview.query()
      .where('review_id', humanReview.id)
      .where('manager_id', managerId)
      .first()

    if (managerReview) {
      // Update existing manager review
      await managerReview
        .merge({
          noteId: reqData.note_id,
          practitionerId: reqData.practitioner_id,
          reviewerId: reqData.reviewer_id,
          versionId: reqData.version_id ?? null,
          versionLabel:
            reqData.version_label !== undefined && reqData.version_label !== null
              ? reqData.version_label
              : managerReview.versionLabel,
          aiScore: reqData.ai_score ?? note.aiScore ?? null,
          humanDecision: reqData.human_decision,
          disagreement: reqData.disagreement,
          priority: reqData.priority ?? note.priority ?? null,
          aiStatus: note.aiStatus ?? null,
        })
        .save()
    } else {
      // Create new manager review
      managerReview = await ManagerReview.create({
        managerId: managerId,
        reviewId: humanReview.id,
        noteId: reqData.note_id,
        practitionerId: reqData.practitioner_id,
        reviewerId: reqData.reviewer_id,
        versionId: reqData.version_id ?? null,
        versionLabel: reqData.version_label ?? null,
        aiScore: reqData.ai_score ?? note.aiScore ?? null,
        humanDecision: reqData.human_decision,
        disagreement: reqData.disagreement,
        priority: reqData.priority ?? note.priority ?? null,
        aiStatus: note.aiStatus ?? null,
        decision: HumanReviewDecisionEnum.accept_ai_evaluation, // Default decision
        chatId: null,
      })
    }

    // Reload with relationships
    await managerReview.load('manager')
    await managerReview.load('review')
    await managerReview.load('session')
    await managerReview.load('practitioner')
    await managerReview.load('reviewer')
    await managerReview.load('version')

    return sendSuccess('SME issue assigned to manager successfully', managerReview)
  } catch (error: any) {
    console.log('Error in assignSmeIssueToManager:', error.message)
    return sendError(error.message)
  }
}
