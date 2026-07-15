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
import {
  getNextDescriptionId,
  resequenceDescriptionIds,
} from '#helpers/sme_issue_template_description_id_helper'
import logger from '@adonisjs/core/services/logger'

export const createSmeIssueTemplate = async (reqData: createSmeIssueTemplateValidatorInterface) => {
  try {
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

    const requestedDescriptionId =
      reqData.description_id && reqData.description_id.trim().length > 0
        ? reqData.description_id.trim()
        : null

    // Check if a template with same combination already exists
    const existingTemplate = await SmeIssuesTamplate.query()
      .where('error_type_id', reqData.error_type_id)
      .where('issues_related_to_id', reqData.issues_related_to_id)
      .where('issue_description_id', reqData.issue_description_id)
      .first()

    if (existingTemplate) {
      return sendError('Template with this combination already exists')
    }

    const descriptionId =
      requestedDescriptionId ?? (await getNextDescriptionId(issuesRelatedTo.displayName))

    const template = await SmeIssuesTamplate.create({
      errorTypeId: reqData.error_type_id,
      issuesRelatedToId: reqData.issues_related_to_id,
      issueDescriptionId: reqData.issue_description_id ?? null,
      descriptionId,
    })

    await template.load('errorType')
    await template.load('issuesRelatedTo')
    if (template.issueDescriptionId) {
      await template.load('issueDescription')
    }

    return sendSuccess('SME issue template created successfully', template)
  } catch (error: any) {
    logger.error('Error in createSmeIssueTemplate:', error.message)
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
    logger.error('Error in listSmeIssueTemplates:', error.message)
    throw new Error('Failed to retrieve SME issue templates. Please try again later.')
  }
}

export const getSmeIssueTemplateByDescriptionId = async (descriptionId: string) => {
  try {
    const smeIssueTemplate = await SmeIssuesTamplate.query()
      .where('description_id', descriptionId)
      .preload('issueDescription')
      .preload('issuesRelatedTo')
      .first()

    if (!smeIssueTemplate) {
      throw new Error(`SME Issue Template with description_id ${descriptionId} does not exist`)
    }

    return smeIssueTemplate
  } catch (error: any) {
    logger.error('Error in getSmeIssueTemplateByDescriptionId:', error.message)
    throw new Error(error.message)
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
    logger.error('Error in getSmeIssueTemplate:', error.message)
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

    const oldIssuesRelatedToId = template.issuesRelatedToId
    const hasDescriptionId = Object.prototype.hasOwnProperty.call(reqData, 'description_id')
    const requestedDescriptionId =
      hasDescriptionId && reqData.description_id && reqData.description_id.trim().length > 0
        ? reqData.description_id.trim()
        : hasDescriptionId
          ? null
          : undefined

    // Verify referenced records exist if being updated
    if (reqData.error_type_id !== undefined) {
      const errorType = await ErrorType.find(reqData.error_type_id)
      if (!errorType) {
        return sendError('Error type not found for the provided error_type_id')
      }
      template.errorTypeId = reqData.error_type_id
    }

    let nextDescriptionId: string | null = null
    if (reqData.issues_related_to_id !== undefined) {
      const issuesRelatedTo = await IssuesRelatedTo.find(reqData.issues_related_to_id)
      if (!issuesRelatedTo) {
        return sendError('Issues related to not found for the provided issues_related_to_id')
      }
      if (reqData.issues_related_to_id !== oldIssuesRelatedToId) {
        nextDescriptionId = await getNextDescriptionId(issuesRelatedTo.displayName)
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

    if (hasDescriptionId) {
      template.descriptionId = requestedDescriptionId ?? null
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

    if (nextDescriptionId && !hasDescriptionId) {
      template.descriptionId = nextDescriptionId
    }

    await template.save()

    if (!hasDescriptionId) {
      if (oldIssuesRelatedToId !== template.issuesRelatedToId) {
        await resequenceDescriptionIds(oldIssuesRelatedToId)
        await resequenceDescriptionIds(template.issuesRelatedToId)
      } else {
        await resequenceDescriptionIds(template.issuesRelatedToId)
      }
    }

    await template.load('errorType')
    await template.load('issuesRelatedTo')
    if (template.issueDescriptionId) {
      await template.load('issueDescription')
    }

    return sendSuccess('SME issue template updated successfully', template)
  } catch (error: any) {
    logger.error('Error in updateSmeIssueTemplate:', error.message)
    return sendError(error.message)
  }
}

export const deleteSmeIssueTemplate = async (id: number) => {
  try {
    const template = await SmeIssuesTamplate.find(id)
    if (!template) {
      return sendError('SME issue template not found')
    }

    const issuesRelatedToId = template.issuesRelatedToId
    await template.delete()
    await resequenceDescriptionIds(issuesRelatedToId)
    return sendSuccess('SME issue template deleted successfully')
  } catch (error: any) {
    logger.error('Error in deleteSmeIssueTemplate:', error.message)
    return sendError(error.message)
  }
}
