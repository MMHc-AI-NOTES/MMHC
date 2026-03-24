import Session, { sessionFilterEnum, sessionSortEnum } from '#models/session'
import User from '#models/user'
import Patient from '#models/patient'
import { applySorting } from '#services/apply_sorting'
import { paginateQuery } from '#services/apply_pagination'
import { applyFilters } from '#services/apply_filter'
import { sendSuccess, sendError } from '#services/custom_response_service'
import { AiStatusEnum, HumanReviewEnum, ManagerEnum, WorkflowEnum } from '#enums/session_enum'
import { UserTypeEnum } from '#enums/user_type_enum'
import { DateTime } from 'luxon'
import Chat from '#models/chat'
import type { updateNoteValidatorInterface } from '#validators/note_validator'
import app from '@adonisjs/core/services/app'
import fs from 'node:fs/promises'

/**
 * Serialize a note with nested children for listing.
 * Child notes don't include previous_note (parent) since parent is already in tree above.
 */
const serializeNoteWithChildren = (note: any, isChild = false): any => {
  const serialized = note.serialize()
  // parent_note_id = newer note. Current = latest (parent_note_id === null). Previous = older = note that has us as parent (childNotes[0]).
  const isCurrentNote = serialized.parent_note_id === null
  const prev = (note.childNotes || [])[0]
  const previousNote = isChild ? null : prev ? prev.serialize() : null
  const versions = serialized.webhookVersions ?? serialized.webhook_versions ?? []
  const versionsWithPrev = versions.map((v: any) => ({
    ...v,
    previous_note: prev ? prev.serialize() : null,
  }))
  serialized.webhookVersions = versionsWithPrev
  delete serialized.webhook_versions
  const children = (note.childNotes || []).map((child: any) =>
    serializeNoteWithChildren(child, true)
  )
  return {
    ...serialized,
    is_current_note: isCurrentNote,
    previous_note: previousNote,
    chat_count: note.$extras?.chat_count || 0,
    version_count: note.$extras?.version_count || 0,
    reviewers: extractReviewers(serialized),
    children,
  }
}

/**
 * Extract unique reviewers from a serialized note object
 */
const extractReviewers = (serialized: any): any[] => {
  const reviewersMap = new Map<number, any>()

  // Helper to add reviewer if exists
  const addReviewer = (id: number | null, reviewer: any) => {
    if (id && reviewer) {
      reviewersMap.set(id, reviewer)
    }
  }

  // From direct humanReviews
  serialized.human_reviews?.forEach((review: any) => {
    addReviewer(review.reviewer_id, review.reviewer)
  })

  // From humanReviews through chats
  serialized.chats?.forEach((chat: any) => {
    chat.human_reviews?.forEach((review: any) => {
      addReviewer(review.reviewer_id, review.reviewer)
    })
  })

  // From SME Issues through webhookVersions
  serialized.webhook_versions?.forEach((version: any) => {
    version.sme_issues?.forEach((issue: any) => {
      addReviewer(issue.reviewer_id, issue.reviewer)
    })
  })

  // From note review marks (user marked note as reviewed)
  serialized.note_review_marks?.forEach((mark: any) => {
    addReviewer(mark.reviewer_id, mark.reviewer)
  })

  return Array.from(reviewersMap.values())
}

export const noteListing = async (
  page?: number,
  pageSize?: number,
  filters?: Array<any>,
  sorts?: Array<any>
) => {
  try {
    let query: any
    let filterData: any
    let sortNote: any

    let noteListings: any = Session.query()
      .preload('practitioner')
      .preload('patient')
      .preload('parentNote')
      .preload('childNotes', (childQuery) => {
        childQuery.preload('practitioner').preload('patient')
      })
      .preload('chats', (chatsQuery) => {
        chatsQuery.orderBy('id', 'desc').preload('humanReviews', (humanReviewsQuery) => {
          humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
        })
      })
      .preload('humanReviews', (humanReviewsQuery) => {
        humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
      })
      .preload('webhookVersions', (versionsQuery) => {
        versionsQuery.preload('smeIssues', (smeIssuesQuery) => {
          smeIssuesQuery.preload('errorType')
          smeIssuesQuery.preload('issuesRelatedTo')
          smeIssuesQuery.preload('issueDescription')
          smeIssuesQuery.preload('reviewer')
        })
        versionsQuery.orderBy('id', 'desc')
      })
      .preload('noteReviewMarks', (marksQuery) => {
        marksQuery.preload('reviewer')
      })
      .withCount('chats', (countQuery) => {
        countQuery.as('chat_count')
      })
      .withCount('webhookVersions', (countQuery) => {
        countQuery.as('version_count')
      })

    let searchFilter: any = null
    let notReviewedByUserIdFilter: any = null
    let notReviewedFilter: any = null
    let otherFilters: Array<any> = []

    if (filters?.length) {
      filters.forEach((filter) => {
        if (filter.columnName === 'search') {
          searchFilter = filter
        } else if (filter.columnName === 'not_reviewed_by_user_id') {
          notReviewedByUserIdFilter = filter
        } else if (filter.columnName === 'not_reviewed') {
          notReviewedFilter = filter
        } else {
          otherFilters.push(filter)
        }
      })
    }

    // Handle filter for notes not reviewed by a specific user
    // Meaning: notes jinko is user ne review nahi kia (chahe kisi aur ne kia ho ya na ho)
    if (notReviewedByUserIdFilter && notReviewedByUserIdFilter.value) {
      const userId = Number.parseInt(String(notReviewedByUserIdFilter.value))
      if (!Number.isNaN(userId)) {
        noteListings = noteListings.whereNotExists((subQuery: any) => {
          subQuery
            .from('human_reviews')
            .whereRaw('human_reviews.note_id = session.note_id')
            .where('human_reviews.reviewer_id', userId)
            .whereNull('human_reviews.deleted_at')
        })
      }
    }

    // Handle filter for notes not reviewed by any user
    if (notReviewedFilter && String(notReviewedFilter.value) === 'true') {
      noteListings = noteListings.whereNotExists((subQuery: any) => {
        subQuery
          .from('human_reviews')
          .whereRaw('human_reviews.note_id = session.note_id')
          .whereNull('human_reviews.deleted_at')
      })
    }

    if (searchFilter && searchFilter.value) {
      const searchValue = String(searchFilter.value).trim()
      if (searchValue) {
        const searchPattern = `%${searchValue}%`

        // 1. Practitioner name: users (type=practitioner) → practitioner_id IN (ids)
        const practitionerIds = await User.query()
          .select('id')
          .where('type', UserTypeEnum.practitioner)
          .whereILike('full_name', searchPattern)
          .then((rows) => rows.map((r) => r.id))

        // 2. Client ID: patients.client_id → patient_id IN (ids)
        const patientIds = await Patient.query()
          .select('id')
          .whereILike('client_id', searchPattern)
          .then((rows) => rows.map((r) => r.id))

        noteListings = noteListings.where((subQuery: any) => {
          subQuery.whereILike('note_id', searchPattern)
          if (practitionerIds.length > 0) {
            subQuery.orWhereIn('practitioner_id', practitionerIds)
          }
          if (patientIds.length > 0) {
            subQuery.orWhereIn('patient_id', patientIds)
          }
        })
      }
    }

    if (otherFilters?.length) {
      filterData = applyFilters(noteListings, otherFilters, sessionFilterEnum)
    }
    if (filterData?.status === false) {
      return {
        status: filterData.status,
        message: filterData.message,
      }
    }
    query = filterData?.query ?? noteListings
    if (sorts?.length) {
      sortNote = applySorting(query, sorts, sessionSortEnum)
      if (sortNote?.status) {
        return sortNote
      }
    }
    let sortQuery = sortNote?.query ?? query
    let noteListingPaginated = await paginateQuery(sortQuery, pageSize, page)

    return {
      count: noteListingPaginated['rows'].length,
      total_count: noteListingPaginated.total,
      total_page_count: noteListingPaginated.lastPage,
      page: noteListingPaginated.currentPage,
      page_size: noteListingPaginated.perPage,
      data: noteListingPaginated['rows'].map((note: any) => {
        const serialized = note.serialize()
        // parent_note_id = newer note. Current = parent_note_id === null. Previous = older = childNotes[0]. Child = newer = parentNote.
        const isCurrentNote = serialized.parent_note_id === null
        const prev = (note.childNotes || [])[0]
        const previousNote = prev ? { id: prev.id, note_id: prev.noteId } : null
        const childNote = note.parentNote
          ? {
              id: note.parentNote.id,
              note_id: note.parentNote.noteId,
              parent_note_id: note.parentNote.parentNoteId,
            }
          : null
        const versions = serialized.webhookVersions ?? serialized.webhook_versions ?? []
        const versionsWithPrev = versions.map((v: any) => ({
          ...v,
          previous_note: prev ? prev.serialize() : null,
        }))
        serialized.webhookVersions = versionsWithPrev
        delete serialized.webhook_versions
        return {
          ...serialized,
          is_current_note: isCurrentNote,
          previous_note: previousNote,
          child_note: childNote,
          chat_count: note.$extras.chat_count || 0,
          version_count: note.$extras.version_count || 0,
          reviewers: extractReviewers(serialized),
        }
      }),
    }
  } catch (error: any) {
    console.log('Error in noteListing:', error.message)
    throw new Error('Failed to retrieve notes. Please try again later.')
  }
}

export const getNoteWithChats = async (noteId: string) => {
  try {
    const note = await Session.query()
      .where('note_id', noteId)
      .preload('practitioner')
      .preload('patient')
      .preload('parentNote')
      .preload('childNotes', (childQuery) => {
        childQuery.preload('practitioner').preload('patient')
      })
      .preload('chats', (chatsQuery) => {
        chatsQuery
          .orderBy('id', 'desc')
          .limit(10)
          .preload('humanReviews', (humanReviewsQuery) => {
            humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
          })
      })
      .preload('humanReviews', (humanReviewsQuery) => {
        humanReviewsQuery.orderBy('id', 'desc').preload('reviewer')
      })
      .preload('webhookVersions', (versionsQuery) => {
        versionsQuery.preload('smeIssues', (smeIssuesQuery) => {
          smeIssuesQuery.preload('errorType')
          smeIssuesQuery.preload('issuesRelatedTo')
          smeIssuesQuery.preload('issueDescription')
          smeIssuesQuery.preload('reviewer')
        })
        versionsQuery.orderBy('id', 'desc')
      })
      .preload('noteReviewMarks', (marksQuery) => {
        marksQuery.preload('reviewer')
      })
      .withCount('chats', (countQuery) => {
        countQuery.as('chat_count')
      })
      .withCount('webhookVersions', (countQuery) => {
        countQuery.as('version_count')
      })
      .first()

    if (!note) {
      console.log('Error in getNoteWithChats: Note not found for note_id:', noteId)
      throw new Error('Note not found for the provided note ID')
    }

    const serialized = note.serialize()
    // parent_note_id = newer note. Current = parent_note_id === null. Previous = older = childNotes[0]. Child = newer = parentNote.
    const isCurrentNote = serialized.parent_note_id === null
    const prev = (note.childNotes || [])[0]
    const previousNote = prev ? prev.serialize() : null
    const childNote = note.parentNote
      ? {
          id: note.parentNote.id,
          note_id: note.parentNote.noteId,
          parent_note_id: note.parentNote.parentNoteId,
        }
      : null
    const versions = serialized.webhookVersions ?? serialized.webhook_versions ?? []
    const versionsWithPrev = versions.map((v: any) => ({
      ...v,
      previous_note: prev ? prev.serialize() : null,
    }))
    serialized.webhookVersions = versionsWithPrev
    delete serialized.webhook_versions
    const noteWithCount = {
      ...serialized,
      is_current_note: isCurrentNote,
      previous_note: previousNote,
      child_note: childNote,
      chat_count: note.$extras.chat_count || 0,
      version_count: note.$extras.version_count || 0,
      reviewers: extractReviewers(serialized),
    }

    return sendSuccess('Note with chats retrieved successfully', noteWithCount)
  } catch (error: any) {
    console.log('error while getting note with chat', error.message)
    throw new Error('error while getting note with chat')
  }
}

export const getQueueStatistics = async (startDate?: string, endDate?: string) => {
  try {
    // Set default dates if not provided (yesterday to today)
    let startDateTime: DateTime
    let endDateTime: DateTime

    if (startDate && endDate) {
      startDateTime = DateTime.fromISO(startDate).startOf('day')
      endDateTime = DateTime.fromISO(endDate).endOf('day')
    } else {
      // Default: yesterday to today
      endDateTime = DateTime.now().endOf('day')
      startDateTime = endDateTime.minus({ days: 1 }).startOf('day')
    }

    // Build query with date filtering
    let query = Session.query().select('ai_status', 'human_review', 'manager', 'workflow')

    // Apply date filter on created_at
    query = query
      .where('created_at', '>=', startDateTime.toSQL()!)
      .where('created_at', '<=', endDateTime.toSQL()!)

    const sessions = await query

    // Initialize counters
    let aiPassed = 0
    let aiFailed = 0
    let pendingHumanReview = 0
    let pendingManagerReview = 0
    let blacklist = 0

    // Iterate through sessions and count
    sessions.forEach((session) => {
      // Count AI passed
      if (session.aiStatus === AiStatusEnum.passed) {
        aiPassed++
      }

      // Count AI failed
      if (session.aiStatus === AiStatusEnum.failed) {
        aiFailed++
      }

      // Count pending human review
      if (session.humanReview === HumanReviewEnum.pending) {
        pendingHumanReview++
      }

      // Count pending manager review
      if (session.manager === ManagerEnum.pending) {
        pendingManagerReview++
      }

      // Count blacklist
      if (session.workflow === WorkflowEnum.blacklisted) {
        blacklist++
      }
    })

    return {
      total_notes: sessions.length,
      ai_passed: aiPassed,
      ai_failed: aiFailed,
      pending_human_review: pendingHumanReview,
      pending_manager_review: pendingManagerReview,
      blacklist: blacklist,
    }
  } catch (error: any) {
    throw new Error(`Error retrieving queue statistics`)
  }
}

export const getWorkloadStatistics = async (userId: number) => {
  try {
    // 1. assign_notes - Count notes where user is the practitioner
    const assignedSessions = await Session.query().where('practitioner_id', userId)
    const assignNotes = assignedSessions.length

    // 2. avg_review_time - Calculate average response_time from chats where user_id matches
    const chatsWithResponseTime = await Chat.query()
      .where('user_id', userId)
      .whereNotNull('response_time')
      .select('response_time')

    let avgReviewTime = 0
    if (chatsWithResponseTime.length > 0) {
      const totalResponseTime = chatsWithResponseTime.reduce(
        (sum, chat) => sum + (chat.responseTime || 0),
        0
      )
      avgReviewTime = totalResponseTime / chatsWithResponseTime.length
      // Round to 2 decimal places
      avgReviewTime = Math.round(avgReviewTime * 100) / 100
    }

    // 3. return_rate - Dummy value for now (will be implemented in future)
    const returnRate = 15

    // 4. ai_disagreement_rate - Dummy value for now (will be implemented in future)
    const aiDisagreementRate = 30

    return {
      assign_notes: assignNotes,
      avg_review_time: avgReviewTime,
      return_rate: returnRate,
      ai_disagreement_rate: aiDisagreementRate,
    }
  } catch (error: any) {
    throw new Error(`Error retrieving workload statistics`)
  }
}

/**
 * Build a small JSON dataset from 10 real notes
 * and write it to dataset.json at the project root.
 */
export const buildTestDataset = async () => {
  try {
    const notes = await Session.query()
      .whereIn('note_id', (subQuery) => {
        subQuery
          .from('note_review_marks')
          .select('note_id')
          .where('marked_as_reviewed', true)
          .groupBy('note_id')
      })
      .preload('childNotes', (childQuery) => {
        childQuery.preload('practitioner').preload('patient')
      })
      .preload('webhookVersions', (versionsQuery) => {
        versionsQuery.preload('smeIssues', (smeIssuesQuery) => {
          smeIssuesQuery
            .preload('errorType')
            .preload('issuesRelatedTo')
            .preload('issueDescription')
            .preload('reviewer')
            .orderBy('id', 'asc')
        })
      })
      .orderBy('id', 'desc')

    const dataset = notes.map((note: any) => {
      const currentSerialized = note.serialize()
      const prev = (note.childNotes || [])[0]

      const noteId = currentSerialized.note_id || note.noteId

      // Prefer the documented sessionTime; fall back to createdAt
      const sessionTime = (note.sessionTime || currentSerialized.sessionTime) as
        | import('luxon').DateTime
        | undefined
      const createdAt = (note.createdAt || currentSerialized.createdAt) as
        | import('luxon').DateTime
        | undefined

      const sessionDate = sessionTime
        ? sessionTime.toFormat('yyyy-MM-dd HH:mm:ss')
        : createdAt
          ? createdAt.toFormat('yyyy-MM-dd HH:mm:ss')
          : null

      const CURRENT_SESSION = {
        note_id: noteId,
        session_date: sessionDate,
        session: currentSerialized.session || '',
      }

      const prevSerialized = prev ? prev.serialize() : null
      const prevSessionTime = (prev?.sessionTime || prevSerialized?.sessionTime) as
        | import('luxon').DateTime
        | undefined
      const prevCreatedAt = (prev?.createdAt || prevSerialized?.createdAt) as
        | import('luxon').DateTime
        | undefined
      const prevSessionDate = prevSessionTime
        ? prevSessionTime.toFormat('yyyy-MM-dd HH:mm:ss')
        : prevCreatedAt
          ? prevCreatedAt.toFormat('yyyy-MM-dd HH:mm:ss')
          : null

      const PREVIOUS_SESSION = {
        note_id: noteId,
        session_date: prev ? prevSessionDate : null,
        session: prevSerialized?.session || '',
      }

      // Collect SME issues, if any, and normalize shape
      const issues: Array<{
        issues_related_to: string | null
        issue_description: string | null
        issue_type: string | null
      }> = []
      const versions = (note.webhookVersions || []).map((v: any) => v)
      versions.forEach((version: any) => {
        ;(version.smeIssues || []).forEach((issue: any) => {
          const s = issue.serialize()
          issues.push({
            issues_related_to:
              (s.issuesRelatedTo?.displayName || s.issuesRelatedTo?.name || null)
                ?.toString()
                .toLowerCase() ?? null,
            issue_description: s.issueDescription?.description || null,
            issue_type: s.errorType?.name || null,
          })
        })
      })

      // Ensure deterministic order so repeated runs don't reshuffle issues
      issues.sort((a: any, b: any) => {
        if (a.id !== null && b.id !== null && a.id !== b.id) {
          return a.id - b.id
        }
        const aCreated = a.createdAt || ''
        const bCreated = b.createdAt || ''
        return String(aCreated).localeCompare(String(bCreated))
      })

      const getIssueDeduction = (issueType: string | null): number => {
        const normalized = (issueType || '').toLowerCase().trim()
        if (normalized === 'critical') return 25
        if (normalized === 'moderate') return 15
        if (normalized === 'minor') return 5
        return 0
      }

      const totalDeduction = issues.reduce((sum, issue) => {
        return sum + getIssueDeduction(issue.issue_type)
      }, 0)

      const score = Math.max(0, 100 - totalDeduction)
      const pass = score > 70

      return {
        instruction: `You are a licensed clinical documentation compliance reviewer evaluating mental health Progress Notes for clinical quality, billing integrity, and legal risk.
You MUST analyze the provided CURRENT_SESSION and PREVIOUS_SESSION strictly based on the written content ONLY.

❗ABSOLUTE RULES:
- Do NOT fabricate.
- Do NOT infer intent.
- Do NOT assume missing documentation.
- Do NOT normalize missing fields.
- If something is missing, unclear, vague, or empty, explicitly treat it as "Not documented in the note".
- Evaluate ALL sections in a SINGLE structured pass.
- If PREVIOUS_SESSION is not provided, evaluate CURRENT_SESSION only and skip duplication comparison.

SCORING FOUNDATION:
- Start score at 100.
- Apply deductions exactly as defined below.
- All deductions must be multiples of 5 only.
- Each violation must be listed separately in the issues array.
- Do NOT double-penalize the same exact issue within the same field.
- Pass = true ONLY if final score > 75.

DUPLICATION ENFORCEMENT (ZERO TOLERANCE – LITERAL MATCH ONLY)

A Critical duplication violation (-25) MUST be applied when:
1. A CURRENT field is 80% or more word-for-word identical to the corresponding PREVIOUS field.
2. The CURRENT field text appears verbatim inside the PREVIOUS field text (even if the previous field is longer).
3. A field is a near-exact copy with minimal wording changes.
4. A required field is 100% copied from the previous note.

IMPORTANT:
- Duplication comparison must be based ONLY on literal word-for-word similarity.
- Similar themes, topics, clinical focus, or subject matter (e.g., work stress, anxiety, mood) are NOT duplication.
- Common clinical phrases (e.g., active listening, empathic responding, coping skills, psychoeducation) MUST NOT trigger duplication unless the entire field is otherwise copied.
- Each duplicated field must receive its OWN –25 deduction.
- Do NOT combine multiple duplicated fields into one violation.
- Do NOT apply multiple –25 penalties to the same field.

FIELD-SPECIFIC EVALUATION RULES (STRICT)

MUST ONLY use the exact violation types explicitly listed under each field.
You MUST evaluate EACH field independently.
For EACH field, ONLY apply the violations listed under that field.
Do NOT invent additional rules.
Apply the exact severity and deduction defined below.
No new violation types may be introduced.
No interpretive labels or conceptual summaries may be created.
Violations must match the wording of listed criteria.
The same criterion may NOT be applied more than once within the same field.
If a documentation problem does not EXACTLY match a listed criterion, it must NOT be scored.


1. Subjective (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Slightly too definitive wording without legal risk
- Repetitive content excluding time, risk flags, or initials
Moderate (-15 pts each):
- Inconsistencies between two or more fields
- Subjective section describes activities/events rather than client internal experience
- Not specific to date of service
Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- SI/HI marked as "Present" but no safety plan included
- Overly definitive language without attribution
- Irrelevant or excessively long content copied from a previous note


2. Objective (Required)

Minor (-5 pts each):
- Repetitive content excluding time, risk flags, or initials
Moderate (-15 pts each):
- Field copy/paste from previous note
- Lack of observable behavior, affect, or presentation

3. Assessment & Therapeutic Intervention (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Slightly too definitive wording without legal risk
- Repetitive content excluding time, risk flags, or initials
Moderate (-15 pts each):
- No clinical interpretation
- No modality or intervention explanation
- Not specific to date of service
-Overly definitive language without attribution
- Inconsistencies between two or more fields
-Lacks Plan and Relevance to session
Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- Note lacks medical necessity
- SI/HI marked as "Present" but no safety plan included
- Irrelevant or excessively long content copied from a previous note


4. Reaction to Intervention (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Repetitive content excluding time, risk flags, or initials

Moderate (-15 pts each):
- Not specific to date of service
- Response not clearly linked to documented intervention

Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- SI/HI marked as "Present" but no safety plan included
- Irrelevant or excessively long content copied from a previous note


5. Plan and Collaboration (Required)

Minor (-5 pts each):
- Vague or non-specific language
- Templated or boilerplate language
- Repetitive content excluding time, risk flags, or initials

Moderate (-15 pts each):
- Inconsistencies between two or more fields
- Not specific to date of service
- Plan is generic, continuity-only, or lacks actionable next steps

Critical (-25 pts each):
- Field copy/paste from previous note (per Duplication Enforcement rules)
- Note lacks medical necessity
- SI/HI marked as "Present" but no safety plan included
- Irrelevant or excessively long content copied from a previous note


6. Progress (Required)

Minor (-5 pts each):
- Progress marked but not supported by note content

Moderate (-15 pts each):
- Inconsistencies between two or more fields


7. Therapist Initials (Required)

Critical (-25 pts):
- Therapist full name and credentials are missing

REQUIRED OUTPUT FORMAT (STRICT JSON ONLY)

{
  "score": <number 0-100>,
  "pass": <true | false>,
  "sentiment": null,
  "summary": null,
  "evaluation": null,
  "issues": [
    {
      "severity": "Critical | Moderate | Minor",
      "points_deducted": <number>,
      "section_id": "<section id or null>",
      "section": "<section name>",
      "justification": "Clear explanation of the issue"
    }
  ],
  "6tx9-1_subjective": null,
  "rb2f-1_objective": null,
  "zad8-1_asment_&_therapeutic_intervention": null,
  "ugq6-1_reaction_to_intervention": null,
  "hnfi-1_plan_and_collaboration": null,
  "9z5t-1_therapist_reflection": null,
  "gm4p-1_progress": null,
  "kxgx-7_&_kxgx-8_suicidality/homicidality": null
}

STRICT ENFORCEMENT:
- ALL keys MUST be present.
- No empty strings allowed.
- If no issues exist, return "issues": [].
- Do NOT add extra keys.
- Do NOT rename keys.
- Do NOT return markdown.
- Do NOT include explanations outside JSON.

Now evaluate the following Progress Note:`,
        CURRENT_SESSION,
        PREVIOUS_SESSION,
        output: {
          score,
          pass,
          issues,
        },
      }
    })

    const filePath = app.makePath('dataset.json')
    await fs.writeFile(filePath, JSON.stringify(dataset, null, 2), 'utf8')

    return dataset
  } catch (error: any) {
    console.log('Error while building test dataset:', error.message)
    throw new Error('Failed to build test dataset')
  }
}

export const updateNote = async (noteId: string, reqData: updateNoteValidatorInterface) => {
  try {
    const note = await Session.query().where('note_id', noteId).first()

    if (!note) {
      return sendError('Note not found for the provided note_id')
    }

    // Update the note
    await note.merge(reqData).save()

    // Reload with relationships
    await note.load('practitioner')
    await note.load('patient')

    return sendSuccess('Note updated successfully', note)
  } catch (error: any) {
    console.log('Error in getNoteWithChats:', error.message)
    throw new Error('error while getting note with chat')
  }
}
