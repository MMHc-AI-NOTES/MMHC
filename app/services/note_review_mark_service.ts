import NoteReviewMark from '#models/note_review_mark'
import Session from '#models/session'
import User from '#models/user'
import { sendSuccess, sendError } from '#services/custom_response_service'
import type { markNoteReviewedValidatorInterface } from '#validators/note_review_mark_validator'
import { DateTime } from 'luxon'

export const markNoteReviewed = async (reqData: markNoteReviewedValidatorInterface) => {
  const reviewerId = reqData.reviewer_id ?? reqData.practitioner_id
  if (reviewerId === undefined) {
    return sendError('Either reviewer_id or practitioner_id is required')
  }
  const note = await Session.query().where('note_id', reqData.note_id).first()
  if (!note) {
    return sendError('Note not found for the provided note_id')
  }

  const reviewer = await User.find(reviewerId)
  if (!reviewer) {
    return sendError('Reviewer not found for the provided reviewer_id')
  }

  let mark = await NoteReviewMark.query()
    .where('note_id', reqData.note_id)
    .where('reviewer_id', reviewerId)
    .first()

  if (!mark) {
    mark = await NoteReviewMark.create({
      noteId: reqData.note_id,
      reviewerId,
      markedAsReviewed: reqData.marked,
      markedAt: reqData.marked ? DateTime.now() : null,
    })
  } else {
    mark.markedAsReviewed = reqData.marked
    mark.markedAt = reqData.marked ? DateTime.now() : null
    await mark.save()
  }

  await mark.load('reviewer')

  return sendSuccess('Note review mark updated successfully', {
    id: mark.id,
    note_id: mark.noteId,
    reviewer_id: mark.reviewerId,
    marked_as_reviewed: mark.markedAsReviewed,
    marked_at: mark.markedAt?.toISO() ?? null,
    reviewer: mark.reviewer,
  })
}

export const getNoteReviewMark = async (noteId: string, reviewerId: number) => {
  const mark = await NoteReviewMark.query()
    .where('note_id', noteId)
    .where('reviewer_id', reviewerId)
    .first()

  if (!mark) {
    return sendSuccess('Note review mark', {
      note_id: noteId,
      reviewer_id: reviewerId,
      marked_as_reviewed: false,
      marked_at: null,
    })
  }

  await mark.load('reviewer')

  return sendSuccess('Note review mark', {
    id: mark.id,
    note_id: mark.noteId,
    reviewer_id: mark.reviewerId,
    marked_as_reviewed: mark.markedAsReviewed,
    marked_at: mark.markedAt?.toISO() ?? null,
    reviewer: mark.reviewer,
  })
}
