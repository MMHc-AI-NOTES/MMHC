import { test } from '@japa/runner'
import { mergeIssueWithTemplate, type ResolvedTemplate } from '#services/mcp_service'
import type { McpAiIssue } from '#interfaces/mcp_interface'

// Template rows as they come out of the DB lookup. The "sub_1" row is the one
// that used to get stamped onto every issue sharing its description text.
const subjectiveTemplate: ResolvedTemplate['meta'] = {
  descriptionId: 'sub_1',
  description: 'Templated/boilerplate/Vague/non-specific to DOS',
  severity: 'moderate',
  points: 15,
  sectionId: '6tx9-1',
  section: 'Subjective',
}

const makeIssue = (overrides: Partial<McpAiIssue>): McpAiIssue =>
  ({
    section: 'Subjective',
    description: 'Templated/boilerplate/Vague/non-specific to DOS',
    description_id: 'sub_1',
    code: 'Not specific to date of service',
    error_type: 'moderate',
    confidence: 0.5,
    evidence: 'some evidence',
    justification: 'some justification',
    detector_tier: 'llm',
    ...overrides,
  }) as McpAiIssue

test.group('mergeIssueWithTemplate - id match', () => {
  test('keeps full template metadata when matched by description_id', ({ assert }) => {
    const issue = makeIssue({})
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.description_id, 'sub_1')
    assert.equal(result.section, 'Subjective')
    assert.equal(result.section_id, '6tx9-1')
    assert.equal(result.points_deducted, 15)
    assert.equal(result.severity, 'moderate')
    assert.isTrue(result.template_matched)
  })

  test('deterministic-style issue passes through unchanged on id match', ({ assert }) => {
    const issue = makeIssue({
      section: 'Assessment & Therapeutic Intervention',
      description: 'No modality',
      description_id: 'ass_4',
      detector_tier: 'deterministic',
      confidence: 1.0,
    })
    const meta: ResolvedTemplate['meta'] = {
      descriptionId: 'ass_4',
      description: 'No modality',
      severity: 'moderate',
      points: 10,
      sectionId: 'zad8-1',
      section: 'Assessment & Therapeutic Intervention',
    }
    const result = mergeIssueWithTemplate(issue, { meta, matchedBy: 'id' })

    assert.equal(result.description_id, 'ass_4')
    assert.equal(result.section, 'Assessment & Therapeutic Intervention')
    assert.equal(result.section_id, 'zad8-1')
    assert.equal(result.detector_tier, 'deterministic')
  })
})

test.group('mergeIssueWithTemplate - text fallback', () => {
  test("keeps the issue's own section and id, takes only points and severity", ({ assert }) => {
    // rec_3 is not in the mapping table, so it text-matches the sub_1 template.
    const issue = makeIssue({
      section: 'Reaction to Intervention',
      description_id: 'rec_3',
    })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'text' })

    assert.equal(result.section, 'Reaction to Intervention')
    assert.equal(result.description_id, 'rec_3')
    assert.isNull(result.section_id)
    // points and severity still come from the template
    assert.equal(result.points_deducted, 15)
    assert.equal(result.severity, 'moderate')
  })

  test('regression: two findings with the same text stay on their own sections', ({ assert }) => {
    // The exact production case: ass_3 and rec_3 share sub_1's description text.
    const assessment = makeIssue({
      section: 'Assessment & Therapeutic Intervention',
      description_id: 'ass_3',
      justification: 'about the intervention',
    })
    const reaction = makeIssue({
      section: 'Reaction to Intervention',
      description_id: 'rec_3',
      justification: 'about the reaction',
    })

    const a = mergeIssueWithTemplate(assessment, { meta: subjectiveTemplate, matchedBy: 'text' })
    const b = mergeIssueWithTemplate(reaction, { meta: subjectiveTemplate, matchedBy: 'text' })

    assert.notEqual(a.section, b.section)
    assert.notEqual(a.description_id, b.description_id)
    assert.equal(a.section, 'Assessment & Therapeutic Intervention')
    assert.equal(b.section, 'Reaction to Intervention')
    // neither may be stamped with the template's section
    assert.notEqual(a.description_id, 'sub_1')
    assert.notEqual(b.description_id, 'sub_1')
  })

  test("issue without its own id on text match gets null id, not the template's", ({ assert }) => {
    const issue = makeIssue({ section: 'Objective', description_id: undefined })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'text' })

    assert.isNull(result.description_id)
    assert.equal(result.section, 'Objective')
  })
})

test.group('mergeIssueWithTemplate - edge cases', () => {
  test('scorer grading is matched case insensitively', ({ assert }) => {
    const issue = makeIssue({ error_type: 'CRITICAL' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'critical')
    assert.equal(result.points_deducted, 25)
  })

  test('surrounding whitespace in the grading is tolerated', ({ assert }) => {
    const issue = makeIssue({ error_type: '  critical  ' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'critical')
    assert.equal(result.points_deducted, 25)
  })

  test('an unrecognised grading is treated as minor rather than dropped', ({ assert }) => {
    const issue = makeIssue({ error_type: 'catastrophic' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'minor')
    assert.equal(result.points_deducted, 5)
  })

  test('major is treated as critical', ({ assert }) => {
    const issue = makeIssue({ error_type: 'major' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'critical')
    assert.equal(result.points_deducted, 25)
  })

  test('medium is treated as moderate', ({ assert }) => {
    const issue = makeIssue({ error_type: 'medium' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'moderate')
    assert.equal(result.points_deducted, 15)
  })

  test('no grading from either side falls back to confidence', ({ assert }) => {
    const issue = makeIssue({ error_type: '', confidence: 0.5 })
    const meta: ResolvedTemplate['meta'] = { ...subjectiveTemplate, severity: null, points: null }
    const result = mergeIssueWithTemplate(issue, { meta, matchedBy: 'id' })

    // 0.5 * 30 = 15, rounded to the nearest five
    assert.equal(result.points_deducted, 15)
  })

  test('no grading and no confidence yields zero points, not a crash', ({ assert }) => {
    const issue = makeIssue({ error_type: '', confidence: undefined })
    const meta: ResolvedTemplate['meta'] = { ...subjectiveTemplate, severity: null, points: null }
    const result = mergeIssueWithTemplate(issue, { meta, matchedBy: 'id' })

    assert.equal(result.points_deducted, 0)
  })

  test('a completely empty template does not throw', ({ assert }) => {
    const issue = makeIssue({})
    const meta: ResolvedTemplate['meta'] = {
      descriptionId: null,
      description: null,
      severity: null,
      points: null,
      sectionId: null,
      section: null,
    }
    const result = mergeIssueWithTemplate(issue, { meta, matchedBy: 'text' })

    assert.equal(result.severity, 'moderate')
    assert.equal(result.points_deducted, 15)
    assert.equal(result.section, 'Subjective')
    assert.isTrue(result.template_matched)
  })

  test('missing justification and evidence are replaced with a placeholder', ({ assert }) => {
    const issue = makeIssue({ justification: '', evidence: '' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.justification, 'empty')
    assert.equal(result.evidence, 'empty')
  })

  test('points are always a multiple of five', ({ assert }) => {
    for (const errorType of ['minor', 'moderate', 'critical', 'unknown', '']) {
      const result = mergeIssueWithTemplate(makeIssue({ error_type: errorType }), {
        meta: subjectiveTemplate,
        matchedBy: 'id',
      })
      assert.equal((result.points_deducted ?? 0) % 5, 0)
    }
  })

  test('detector tier and confidence pass through untouched', ({ assert }) => {
    const issue = makeIssue({ detector_tier: 'deterministic', confidence: 1 })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.detector_tier, 'deterministic')
    assert.equal(result.confidence, 1)
  })
})

test.group('mergeIssueWithTemplate - severity always comes from the scorer', () => {
  test('a mismapped template cannot inflate the severity or points', ({ assert }) => {
    // Production case: ass_4 was graded moderate by the scorer but the mapping
    // row pointed at a critical template, so it displayed as critical -25.
    const issue = makeIssue({
      section: 'Assessment & Therapeutic Intervention',
      description: 'No modality',
      description_id: 'ass_4',
      error_type: 'moderate',
      detector_tier: 'deterministic',
    })
    const criticalTemplate: ResolvedTemplate['meta'] = {
      descriptionId: 'ass_4',
      description: 'Field copy/paste from previous note',
      severity: 'critical',
      points: 25,
      sectionId: 'zad8-1',
      section: 'Assessment & Therapeutic Intervention',
    }
    const result = mergeIssueWithTemplate(issue, { meta: criticalTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'moderate')
    assert.equal(result.points_deducted, 15)
    assert.notEqual(result.severity, 'critical')
    assert.notEqual(result.points_deducted, 25)
  })

  test('a critical grading from the scorer is respected', ({ assert }) => {
    const issue = makeIssue({ error_type: 'critical', description_id: 'obj_2' })
    const moderateTemplate: ResolvedTemplate['meta'] = { ...subjectiveTemplate, severity: 'moderate', points: 15 }
    const result = mergeIssueWithTemplate(issue, { meta: moderateTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'critical')
    assert.equal(result.points_deducted, 25)
  })

  test('falls back to the template grading when the scorer sends none', ({ assert }) => {
    const issue = makeIssue({ error_type: '' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'moderate')
    assert.equal(result.points_deducted, 15)
  })

  test('points follow severity, not the template value', ({ assert }) => {
    // Template says 5 points but grades it critical; points must match critical.
    const issue = makeIssue({ error_type: 'critical' })
    const inconsistentTemplate: ResolvedTemplate['meta'] = { ...subjectiveTemplate, severity: 'critical', points: 5 }
    const result = mergeIssueWithTemplate(issue, { meta: inconsistentTemplate, matchedBy: 'id' })

    assert.equal(result.severity, 'critical')
    assert.equal(result.points_deducted, 25)
  })
})

test.group('mergeIssueWithTemplate - label always comes from the scorer', () => {
  test('a mismapped template cannot relabel the finding', ({ assert }) => {
    // Production case: ass_4 ("No modality") was mapped to a template row
    // whose text reads "Field copy/paste from previous note".
    const issue = makeIssue({
      section: 'Assessment & Therapeutic Intervention',
      description: 'No modality',
      description_id: 'ass_4',
      detector_tier: 'deterministic',
      justification: 'Deterministic rule R6 fired - no whitelist modality matched',
    })
    const wrongTemplate: ResolvedTemplate['meta'] = {
      descriptionId: 'ass_4',
      description: 'Field copy/paste from previous note',
      severity: 'critical',
      points: 25,
      sectionId: 'zad8-1',
      section: 'Assessment & Therapeutic Intervention',
    }
    const result = mergeIssueWithTemplate(issue, { meta: wrongTemplate, matchedBy: 'id' })

    // label follows the scorer, not the mismapped template
    assert.equal(result.description, 'No modality')
    assert.equal(result.severity_details, 'No modality')
    assert.notEqual(result.description, 'Field copy/paste from previous note')
    // grading also follows the scorer, so the critical template cannot inflate it
    assert.equal(result.severity, 'moderate')
    assert.equal(result.points_deducted, 15)
  })

  test('title and justification always describe the same finding', ({ assert }) => {
    const issue = makeIssue({
      description: 'No clinical interpretation',
      description_id: 'ass_5',
      justification: 'no clinical conceptualization is present',
    })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'text' })

    assert.equal(result.description, 'No clinical interpretation')
    assert.equal(result.justification, 'no clinical conceptualization is present')
  })

  test('falls back to the template text when the scorer sends no label', ({ assert }) => {
    const issue = makeIssue({ description: '' })
    const result = mergeIssueWithTemplate(issue, { meta: subjectiveTemplate, matchedBy: 'id' })

    assert.equal(result.description, 'Templated/boilerplate/Vague/non-specific to DOS')
  })
})

test.group('mergeIssueWithTemplate - points and severity', () => {
  test('falls back to confidence-based points when template has none', ({ assert }) => {
    const meta: ResolvedTemplate['meta'] = { ...subjectiveTemplate, points: null }
    const issue = makeIssue({ confidence: 0.5 })
    const result = mergeIssueWithTemplate(issue, { meta, matchedBy: 'id' })

    // 0.5 * 30 = 15, rounded to nearest 5
    assert.equal(result.points_deducted, 15)
  })

  test('score arithmetic input is unchanged for a mixed set', ({ assert }) => {
    const issues = [
      mergeIssueWithTemplate(makeIssue({}), { meta: subjectiveTemplate, matchedBy: 'id' }),
      mergeIssueWithTemplate(
        makeIssue({ section: 'Reaction to Intervention', description_id: 'rec_3' }),
        {
          meta: subjectiveTemplate,
          matchedBy: 'text',
        }
      ),
    ]
    const total = issues.reduce((sum, i) => sum + Math.abs(i.points_deducted ?? 0), 0)

    // same deductions as before the fix: 15 + 15
    assert.equal(total, 30)
    assert.equal(Math.max(0, 100 - total), 70)
  })
})
