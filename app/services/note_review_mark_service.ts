import NoteReviewMark from '#models/note_review_mark'
import HumanReview from '#models/human_review'
import Session from '#models/session'
import User from '#models/user'
import WebhookSessionVersion from '#models/webhook_session_version'
import { sendSuccess, sendError } from '#services/custom_response_service'
import type { markNoteReviewedValidatorInterface } from '#validators/note_review_mark_validator'
import { HumanReviewDecisionEnum } from '#enums/human_review_enum'
import { createAuditLog } from '#services/audit_log_service'
import { AuditActionEnum } from '#enums/audit_log_enum'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { UserTypeEnum } from '#enums/user_type_enum'
import logger from '@adonisjs/core/services/logger'

export const markNoteReviewed = async (
  reqData: markNoteReviewedValidatorInterface,
  currentUserId: number,
  ctx?: HttpContext
) => {
  const reviewerId = currentUserId
  const note = await Session.query().where('note_id', reqData.note_id).first()
  if (!note) {
    return sendError('Note not found for the provided note_id')
  }

  const version = await WebhookSessionVersion.query()
    .where('id', reqData.note_version_id)
    .where('note_id', reqData.note_id)
    .first()
  if (!version) {
    return sendError('Note version not found or does not belong to this note')
  }

  const reviewer = await User.find(reviewerId)
  if (!reviewer) {
    return sendError('Reviewer not found for the provided reviewer_id')
  }

  const noteId = note.noteId

  let mark = await NoteReviewMark.query()
    .where('note_id', noteId)
    .where('note_version_id', reqData.note_version_id)
    .where('reviewer_id', reviewerId)
    .first()

  if (!mark) {
    mark = await NoteReviewMark.create({
      noteId,
      noteVersionId: reqData.note_version_id,
      reviewerId,
      markedAsReviewed: reqData.marked,
      markedAt: reqData.marked ? DateTime.now() : null,
    })
  } else {
    mark.markedAsReviewed = reqData.marked
    mark.markedAt = reqData.marked ? DateTime.now() : null
    await mark.save()
  }

  // Ensure human_reviews has an entry so note preload shows reviewer (with or without SME issues)
  let humanReview = await HumanReview.query()
    .where('note_id', noteId)
    .where('reviewer_id', reviewerId)
    .where('version_id', reqData.note_version_id)
    .first()

  const humanReviewPayload = {
    noteId,
    practitionerId: note.practitionerId,
    reviewerId,
    versionId: reqData.note_version_id,
    decision: HumanReviewDecisionEnum.accept_ai_evaluation,
    aiStatus: note.aiStatus ?? null,
    priority: note.priority ?? null,
    chatId: null,
  }

  if (humanReview) {
    await humanReview.merge(humanReviewPayload).save()
  } else {
    await HumanReview.create(humanReviewPayload)
  }

  await mark.load('reviewer')

  await createAuditLog({
    ctx,
    userId: currentUserId,
    description: `Note marked as ${reqData.marked ? 'reviewed' : 'unreviewed'} for note ${
      noteId
    } (version ${reqData.note_version_id})`,
    action: AuditActionEnum.noteMarkedReviewed,
    status: true,
    modelType: 'NoteReviewMark',
    modelId: mark.id,
    noteId,
    metadata: {
      note_id: noteId,
      note_version_id: reqData.note_version_id,
      reviewer_id: reviewerId,
      marked: reqData.marked,
    },
  })

  return sendSuccess('Note review mark updated successfully', {
    id: mark.id,
    note_id: mark.noteId,
    note_version_id: mark.noteVersionId,
    reviewer_id: mark.reviewerId,
    marked_as_reviewed: mark.markedAsReviewed,
    marked_at: mark.markedAt?.toISO() ?? null,
    reviewer: mark.reviewer,
  })
}

export const getNoteReviewMark = async (
  noteId: string,
  reviewerId: number,
  noteVersionId: number
) => {
  const mark = await NoteReviewMark.query()
    .where('note_id', noteId)
    .where('reviewer_id', reviewerId)
    .where('note_version_id', noteVersionId)
    .first()

  if (!mark) {
    return sendSuccess('Note review mark', {
      note_id: noteId,
      note_version_id: noteVersionId,
      reviewer_id: reviewerId,
      marked_as_reviewed: false,
      marked_at: null,
    })
  }

  await mark.load('reviewer')

  return sendSuccess('Note review mark', {
    id: mark.id,
    note_id: mark.noteId,
    note_version_id: mark.noteVersionId,
    reviewer_id: mark.reviewerId,
    marked_as_reviewed: mark.markedAsReviewed,
    marked_at: mark.markedAt?.toISO() ?? null,
    reviewer: mark.reviewer,
  })
}

export const getSmeReviewersNoteCounts = async (timeframe?: string) => {
  try {
    const validTimeframes = ['today', 'this_week', 'all_time']
    const normalizedTimeframe =
      timeframe && validTimeframes.includes(timeframe.toLowerCase().trim())
        ? timeframe.toLowerCase().trim()
        : 'all_time'

    const smeReviewers = await User.query()
      .where('type', UserTypeEnum.sme_reviewer)
      .where('is_active', true)
      .select('id', 'full_name', 'email')

    const query = NoteReviewMark.query()
      .where('marked_as_reviewed', true)
      .select('reviewer_id')
      .countDistinct('note_id as reviewed_notes_count')

    if (normalizedTimeframe === 'today') {
      const startOfDay = DateTime.now().startOf('day')
      query.where('marked_at', '>=', startOfDay.toJSDate())
    } else if (normalizedTimeframe === 'this_week') {
      const startOfWeek = DateTime.now().startOf('week')
      query.where('marked_at', '>=', startOfWeek.toJSDate())
    }
    // 'all_time' applies no additional date filter

    const countsRaw = await query.groupBy('reviewer_id')

    const countMap = new Map<number, number>()
    ;(countsRaw as any[]).forEach((r) => {
      countMap.set(Number(r.reviewerId), Number(r.$extras.reviewed_notes_count))
    })

    return sendSuccess(
      'Sme reviewers review counts retrieved successfully',
      smeReviewers.map((u: any) => ({
        reviewer_id: u.id,
        reviewer_full_name: u.fullName ?? null,
        reviewer_email: u.email ?? null,
        reviewed_notes_count: countMap.get(u.id) ?? 0,
      }))
    )
  } catch (error: any) {
    logger.error('getSmeReviewersNoteCounts error', error.message)
    return sendError('Failed to retrieve sme reviewers note counts')
  }
}
