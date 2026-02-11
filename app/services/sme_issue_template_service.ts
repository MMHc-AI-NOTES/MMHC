import ErrorType from '#models/error_type'
import IssuesRelatedTo from '#models/issues_related_to'
import IssueDescription from '#models/issue_description'
import SmeIssuesTamplate from '#models/sme_issues_tamplate'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { paginateQuery } from '#services/apply_pagination'
import type {
  createSmeIssueTemplateValidatorInterface,
  updateSmeIssueTemplateValidatorInterface,
} from '#validators/sme_issue_template_validator'

export const createSmeIssueTemplate = async (reqData: createSmeIssueTemplateValidatorInterface) => {
  try {
    // Verify referenced records exist
    const errorType = await ErrorType.find(reqData.error_type_id)
    if (!errorType) {
      return sendError('Error type not found for the provided error_type_id')
    }

    const issuesRelatedTo = await IssuesRelatedTo.find(reqData.issues_related_to_id)
    if (!issuesRelatedTo) {
      return sendError('Issues related to not found for the provided issues_related_to_id')
    }

    if (reqData.issue_description_id) {
      const issueDescription = await IssueDescription.find(reqData.issue_description_id)
      if (!issueDescription) {
        return sendError('Issue description not found for the provided issue_description_id')
      }
    }

    // Check if a template with same combination already exists
    const existingTemplate = await SmeIssuesTamplate.query()
      .where('error_type_id', reqData.error_type_id)
      .where('issues_related_to_id', reqData.issues_related_to_id)
      .where('issue_description_id', reqData.issue_description_id)
      .first()

    if (existingTemplate) {
      return sendError('Template with this combination already exists')
    }

    const template = await SmeIssuesTamplate.create({
      errorTypeId: reqData.error_type_id,
      issuesRelatedToId: reqData.issues_related_to_id,
      issueDescriptionId: reqData.issue_description_id ?? null,
    })

    await template.load('errorType')
    await template.load('issuesRelatedTo')
    if (template.issueDescriptionId) {
      await template.load('issueDescription')
    }

    return sendSuccess('SME issue template created successfully', template)
  } catch (error: any) {
    console.log('Error in createSmeIssueTemplate:', error.message)
    return sendError(error.message)
  }
}

export const listSmeIssueTemplates = async (page?: number, pageSize?: number) => {
  try {
    let query = SmeIssuesTamplate.query()
      .preload('errorType')
      .preload('issuesRelatedTo')
      .preload('issueDescription')
      .orderBy('id', 'desc')

    const paginated = await paginateQuery(query, pageSize, page)

    return {
      count: paginated['rows'].length,
      total_count: paginated.total,
      total_page_count: paginated.lastPage,
      page: paginated.currentPage,
      page_size: paginated.perPage,
      data: paginated['rows'].map((template: any) => ({
        ...template.serialize(),
      })),
    }
  } catch (error: any) {
    console.log('Error in listSmeIssueTemplates:', error.message)
    throw new Error('Failed to retrieve SME issue templates. Please try again later.')
  }
}

export const getSmeIssueTemplate = async (id: number) => {
  try {
    const template = await SmeIssuesTamplate.query()
      .where('id', id)
      .preload('errorType')
      .preload('issuesRelatedTo')
      .preload('issueDescription')
      .first()

    if (!template) {
      return sendError('SME issue template not found')
    }

    return sendSuccess('SME issue template retrieved successfully', template)
  } catch (error: any) {
    console.log('Error in getSmeIssueTemplate:', error.message)
    return sendError(error.message)
  }
}

export const updateSmeIssueTemplate = async (
  id: number,
  reqData: updateSmeIssueTemplateValidatorInterface
) => {
  try {
    const template = await SmeIssuesTamplate.find(id)
    if (!template) {
      return sendError('SME issue template not found')
    }

    // Verify referenced records exist if being updated
    if (reqData.error_type_id !== undefined) {
      const errorType = await ErrorType.find(reqData.error_type_id)
      if (!errorType) {
        return sendError('Error type not found for the provided error_type_id')
      }
      template.errorTypeId = reqData.error_type_id
    }

    if (reqData.issues_related_to_id !== undefined) {
      const issuesRelatedTo = await IssuesRelatedTo.find(reqData.issues_related_to_id)
      if (!issuesRelatedTo) {
        return sendError('Issues related to not found for the provided issues_related_to_id')
      }
      template.issuesRelatedToId = reqData.issues_related_to_id
    }

    if (reqData.issue_description_id !== undefined) {
      if (reqData.issue_description_id !== null) {
        const issueDescription = await IssueDescription.find(reqData.issue_description_id)
        if (!issueDescription) {
          return sendError('Issue description not found for the provided issue_description_id')
        }
      }
      template.issueDescriptionId = reqData.issue_description_id ?? null
    }

    // Compute final combination after update (use existing values when not provided)
    const finalErrorTypeId = reqData.error_type_id ?? template.errorTypeId
    const finalIssuesRelatedToId = reqData.issues_related_to_id ?? template.issuesRelatedToId
    const finalIssueDescriptionId =
      reqData.issue_description_id !== undefined
        ? reqData.issue_description_id
        : template.issueDescriptionId

    // Check if another template with the same combination already exists
    const existingTemplateQuery = SmeIssuesTamplate.query()
      .where('error_type_id', finalErrorTypeId)
      .where('issues_related_to_id', finalIssuesRelatedToId)
      .whereNot('id', id)

    if (finalIssueDescriptionId === null) {
      existingTemplateQuery.whereNull('issue_description_id')
    } else {
      existingTemplateQuery.where('issue_description_id', finalIssueDescriptionId)
    }

    const existingTemplateWithSameCombination = await existingTemplateQuery.first()

    if (existingTemplateWithSameCombination) {
      return sendError('Template with this combination already exists')
    }

    await template.save()

    await template.load('errorType')
    await template.load('issuesRelatedTo')
    if (template.issueDescriptionId) {
      await template.load('issueDescription')
    }

    return sendSuccess('SME issue template updated successfully', template)
  } catch (error: any) {
    console.log('Error in updateSmeIssueTemplate:', error.message)
    return sendError(error.message)
  }
}

export const deleteSmeIssueTemplate = async (id: number) => {
  try {
    const template = await SmeIssuesTamplate.find(id)
    if (!template) {
      return sendError('SME issue template not found')
    }

    await template.delete()
    return sendSuccess('SME issue template deleted successfully')
  } catch (error: any) {
    console.log('Error in deleteSmeIssueTemplate:', error.message)
    return sendError(error.message)
  }
}
