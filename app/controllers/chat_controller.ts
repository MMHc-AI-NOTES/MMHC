import {
  chatIdValidator,
  createChatValidator,
  updateChatValidator,
} from '#validators/chat_validator'
import { paginationValidator } from '#validators/pagination_validator'
import {
  createChat,
  deleteChat,
  getChatById,
  listChats,
  updateChat,
  reevaluateChat,
  directChat,
  directChat2,
} from '#services/chat_service'
import type { HttpContext } from '@adonisjs/core/http'
import ErrorService from '#services/error_service'

export default class ChatController {
  public async create(ctx: HttpContext) {
    try {
      const payload = await createChatValidator.validate(ctx.request.body())
      const user = ctx.auth.getUserOrFail()
      const chatResponse = await createChat(payload, user.id)
      return chatResponse
    } catch (error) {
      console.log('chat creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async directChat(ctx: HttpContext) {
    try {
      const chatResponse = await directChat(ctx.request.body())
      return chatResponse
    } catch (error) {
      console.log('chat creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async directChat2(ctx: HttpContext) {
    try {
      const chatResponse = await directChat2(ctx.request.body())
      return chatResponse
    } catch (error) {
      console.log('chat creating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async show(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const chatResponse = await getChatById(chatId)
      return chatResponse
    } catch (error) {
      console.log('chat getting by id error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async update(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const payload = await updateChatValidator.validate(ctx.request.body())
      const chatResponse = await updateChat(payload, chatId)
      return chatResponse
    } catch (error) {
      console.log('chat updating error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async delete(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const chatResponse = await deleteChat(chatId)
      return chatResponse
    } catch (error) {
      console.log('chat deleting error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async listing(ctx: HttpContext) {
    try {
      const { page, pageSize, filters, sorts } = await paginationValidator.validate(
        ctx.request.body()
      )
      const chatResponse = await listChats(page, pageSize, filters, sorts)
      return chatResponse
    } catch (error) {
      console.log('chat listing error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async reevaluate(ctx: HttpContext) {
    try {
      const { chatId } = await chatIdValidator.validate(ctx.params)
      const chatResponse = await reevaluateChat(chatId)
      return chatResponse
    } catch (error) {
      console.log('chat re-evaluation error', error)
      return ErrorService.handleError(ctx, error)
    }
  }

  public async outputAggregator(ctx: HttpContext) {
    try {
      // const text = {
      //   section: 'aggregator',
      //   response:
      //     '```json\n{\n  "score": 72,\n  "pass_fail": "FAIL",\n  "sentiment": "Neutral - Clinical documentation present but with significant quality concerns",\n  "summary": "This progress note documents a 53-minute individual therapy session addressing anxiety and relationship challenges. While basic clinical elements are present, the note contains critical documentation deficiencies including substantial duplication from the previous note, vague clinical language, missing medical necessity justification, and inconsistent clinical presentation that raises concerns about documentation integrity.",\n  "detailed_evaluation": "The note demonstrates fundamental clinical documentation structure with appropriate sections for subjective, objective, assessment, and plan. However, multiple critical and moderate violations significantly compromise its quality and compliance. Most notably, approximately 70% of the assessment and intervention content is duplicated verbatim from the previous session note (identical person-centered approach language, same therapeutic skills listed, nearly identical reaction to intervention statements). This duplication raises serious concerns about whether the note accurately reflects the current session or represents a template-based documentation practice. The subjective presentation contradicts the previous note (currently \'anxious manner\' vs. previously \'calm manner\'), yet the interventions and outcomes remain nearly identical, suggesting potential documentation inconsistency. The note lacks specific clinical interpretation of the client\'s anxiety presentation, relationship challenges, or how the somatic education directly addresses the stated concerns. Medical necessity is not established—there is no clear connection between the presenting problem (relationship challenges and anxiety) and the interventions provided (somatic exercises, yoga). The therapist initials are present but formatted as a full name rather than standard initials. The 53-minute session duration aligns with a 60-minute CPT code (90834 or 90837), which is appropriate. However, the vague documentation of \'moderate progress\' without specific behavioral or symptomatic changes limits clinical utility and continuity.",\n  "issues": [\n    {\n      "type": "Critical Violation",\n      "severity": -25,\n      "code": "DUPLICATE_CONTENT",\n      "description": "Substantial verbatim duplication from previous note. Assessment & Therapeutic Intervention section contains nearly identical language: \'person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard.\' Reaction to Intervention is similarly duplicated: \'Client was receptive and interactive throughout the duration of the session and responded well to all interventions.\' This pattern suggests template-based documentation rather than session-specific clinical documentation.",\n      "location": "Assessment & Therapeutic Intervention; Reaction to Intervention"\n    },\n    {\n      "type": "Critical Violation",\n      "severity": -25,\n      "code": "LACK_OF_MEDICAL_NECESSITY",\n      "description": "No clear clinical justification for interventions. Client presented with anxiety and relationship challenges, but the connection between these presenting problems and the recommended interventions (somatic exercises, beginner\'s yoga) is not established. Why are these specific interventions appropriate for this client\'s stated concerns? What is the clinical rationale?",\n      "location": "Assessment & Therapeutic Intervention; Plan and Collaboration"\n    },\n    {\n      "type": "Moderate Violation",\n      "severity": -15,\n      "code": "INCONSISTENT_PRESENTATION",\n      "description": "Contradictory clinical presentation between current and previous note. Previous note documents client presented in \'calm manner\' and discussed \'recent progress.\' Current note documents client presented in \'anxious manner\' and discussed \'recent challenges.\' Yet interventions, outcomes, and progress statements remain nearly identical, raising concerns about documentation accuracy.",\n      "location": "Subjective section; comparison with previous_note"\n    },\n    {\n      "type": "Moderate Violation",\n      "severity": -15,\n      "code": "MISSING_CLINICAL_INTERPRETATION",\n      "description": "Assessment section lacks specific clinical interpretation. No analysis of why client presented anxiously, what relationship challenges were identified, or how the anxiety manifests. The assessment is purely descriptive of interventions used rather than interpretive of the client\'s clinical presentation or progress.",\n      "location": "Assessment & Therapeutic Intervention"\n    },\n    {\n      "type": "Moderate Violation",\n      "severity": -15,\n      "code": "VAGUE_PROGRESS_DOCUMENTATION",\n      "description": "\'Moderate progress\' is stated without specific behavioral, symptomatic, or functional indicators. What specific changes constitute moderate progress? How does this compare to previous \'some progress\'? Vague progress statements limit clinical utility and continuity of care.",\n      "location": "Progress field"\n    },\n    {\n      "type": "Minor Violation",\n      "severity": -5,\n      "code": "THERAPIST_INITIALS_FORMAT",\n      "description": "Therapist identification provided as full name \'Raquel Castello, LMHC, R.V.C\' rather than standard initials format. While credentials are present, the format deviates from typical clinical documentation standards for therapist initials.",\n      "location": "Therapist Initials field"\n    },\n    {\n      "type": "Minor Violation",\n      "severity": -5,\n      "code": "VAGUE_RELATIONSHIP_CHALLENGES",\n      "description": "Client\'s relationship challenges are mentioned but not specifically documented. What are the nature of these challenges? How do they relate to the client\'s anxiety? Lack of specificity limits clinical understanding and treatment planning.",\n      "location": "Subjective section"\n    }\n  ],\n  "per_section_evaluations": {\n    "session_duration": {\n      "status": "COMPLIANT",\n      "notes": "53-minute session documented. Appropriate for 60-minute CPT codes (90834, 90837). Duration is clearly stated and aligns with billing requirements."\n    },\n    "mental_status": {\n      "status": "COMPLIANT",\n      "notes": "Suicidality and homicidality appropriately screened and documented as denied/not reported. No safety concerns flagged."\n    },\n    "subjective": {\n      "status": "DEFICIENT",\n      "notes": "Generic and vague. Statements such as \'discussed recent challenges within her relationship\' lack specificity. No detail regarding nature of challenges, client\'s emotional experience, or presenting concerns. Contradicts previous note\'s description of client presentation (anxious vs. calm)."\n    },\n    "objective": {\n      "status": "MINIMAL",\n      "notes": "Extremely brief. Only states \'Client was engaged and interactive during the session.\' No behavioral observations, affect description, or clinical observations that would support the subjective presentation of anxiety."\n    },\n    "assessment_and_intervention": {\n      "status": "DEFICIENT",\n      "notes": "Approximately 70% verbatim duplication from previous note. Lacks specific clinical interpretation. No explanation of why person-centered approach is appropriate for this client\'s anxiety and relationship concerns. No connection between presenting problems and interventions. Generic therapeutic skills listed without session-specific application."\n    },\n    "reaction_to_intervention": {\n      "status": "DEFICIENT",\n      "notes": "Nearly identical to previous note. Generic statement: \'Client was receptive and interactive throughout the duration of the session and responded well to all interventions.\' No specific feedback on client\'s response to somatic exercises education or how this will be applied."\n    },\n    "plan_and_collaboration": {\n      "status": "MINIMAL",\n      "notes": "Plan to continue weekly sessions is appropriate but generic. Recommendation for beginner\'s yoga class is mentioned but lacks clinical justification or connection to presenting concerns. No specific homework or skill-building assignments documented."\n    },\n    "therapist_reflection_and_insight": {\n      "status": "MISSING",\n      "notes": "Section is marked optional and left blank. While optional, inclusion of therapist reflection would enhance clinical quality and demonstrate clinical reasoning."\n    },\n    "progress": {\n      "status": "DEFICIENT",\n      "notes": "Vague documentation of \'Moderate progress\' without specific indicators. No measurable outcomes, behavioral changes, or symptomatic improvement documented. Unclear how this represents progress from previous session\'s \'Some progress.\'"\n    },\n    "therapist_initials": {\n      "status": "PRESENT_WITH_DEVIATION",\n      "notes": "Therapist identification present (Raquel Castello, LMHC, R.V.C) with credentials. However, format deviates from standard clinical initials format. Credentials are appropriately included."\n    }\n  }\n}\n```',
      // }

      // const text = {
      //   section: 'subjective',
      //   response:
      //     '```json\n{\n  "score": 55,\n  "pass": false,\n  "issues": [\n    {\n      "points_deducted": 15,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Overly definitive diagnostic language without attribution. \'The client presented in an anxious manner\' is a clinician observation and interpretation, not a client-reported experience. Should be attributed to client report (e.g., \'Client reported feeling anxious\' or \'Client stated she felt anxious\')."\n    },\n    {\n      "points_deducted": 15,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Vague and generic phrasing that does not reflect the client\'s lived experience. \'Recent challenges within her relationship,\' \'worries and fears,\' and \'was vocal in the session\' lack specificity. No details about what the challenges are, what the worries/fears concern, or what was actually discussed. Does not establish medical necessity or clinical relevance."\n    },\n    {\n      "points_deducted": 15,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Client voice is minimized and replaced with clinician framing. The entire section describes what the client did or how she presented rather than what the client reported about her experience, thoughts, emotions, or concerns. No direct or paraphrased client statements are present."\n    },\n    {\n      "points_deducted": 5,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Slightly templated phrasing (\'Client was able to express,\' \'Client was vocal\') that reads reusable across sessions and clients. Lacks emotional or experiential detail specific to this date of service."\n    }\n  ],\n  "summary": "The Subjective section fails to adequately document the client\'s reported experience and does not establish clear medical necessity. The content is clinician-centered, describing the client\'s presentation and behavior rather than capturing what the client actually said about her relationship challenges, worries, and fears. Specific details about the relationship issues, the nature of her anxiety, and her perspective on these concerns are absent. The language is generic and templated, lacking personalization to this session. To improve, the note should include: (1) client-attributed statements about the relationship challenges, (2) specific examples or details of worries/fears, (3) client\'s perspective on how these issues are affecting her, and (4) direct or clearly paraphrased client voice rather than clinician observation."\n}\n```',
      // }

      // const text = {
      //   section: 'aggregator',
      //   response:
      //     '```json\n{\n  "score": 50,\n  "pass": false,\n  "sentiment": "CRITICAL COMPLIANCE FAILURE",\n  "summary": "Current note contains extensive copying from previous note with insufficient differentiation. Multiple sections are flagged as duplicated content, resulting in severe documentation violations. Clinical content lacks specificity and individualization.",\n  "evaluation": "This note demonstrates substantial copying from the previous session dated the same time slot (10am-10:53am). Critical sections are either identical or minimally modified, violating clinical documentation standards requiring unique, individualized documentation for each session.",\n  "issues": [\n    {\n      "section": "Session Duration",\n      "severity": "CRITICAL",\n      "issue": "Identical to previous note (10am-10:53am) - suggests possible documentation error or copied template",\n      "points_deducted": 5\n    },\n    {\n      "section": "Suicidality/Homicidality",\n      "severity": "CRITICAL",\n      "issue": "Copied from previous note - identical wording and format",\n      "points_deducted": 25\n    },\n    {\n      "section": "Subjective",\n      "severity": "CRITICAL",\n      "issue": "Substantially copied from previous note with minor modifications (\'anxious manner\' vs \'calm manner\', \'relationship challenges\' vs \'progress noticed\'). Core structure and clinical approach identical.",\n      "points_deducted": 25\n    },\n    {\n      "section": "Objective",\n      "severity": "CRITICAL",\n      "issue": "Copied verbatim from previous note - identical wording",\n      "points_deducted": 25\n    },\n    {\n      "section": "Assessment & Therapeutic Intervention",\n      "severity": "CRITICAL",\n      "issue": "Substantially copied from previous note. Identical therapeutic approach description (person-centered, active listening, empathic responding, unconditional positive regard). Only intervention type differs (somatic exercises vs DBT mindfulness).",\n      "points_deducted": 25\n    },\n    {\n      "section": "Reaction to Intervention",\n      "severity": "CRITICAL",\n      "issue": "Copied from previous note with minimal modification - same receptive/interactive language",\n      "points_deducted": 25\n    },\n    {\n      "section": "Plan and Collaboration",\n      "severity": "CRITICAL",\n      "issue": "Substantially copied from previous note. Both recommend weekly sessions and specific activity (yoga vs mindfulness). Lacks individualized planning.",\n      "points_deducted": 25\n    },\n    {\n      "section": "Progress Rating",\n      "severity": "MODERATE",\n      "issue": "Vague rating (\'Moderate progress\') with no specific metrics, measurable outcomes, or comparison to previous session goals. Lacks clinical specificity.",\n      "points_deducted": 5\n    },\n    {\n      "section": "Overall Documentation",\n      "severity": "CRITICAL",\n      "issue": "Note demonstrates template copying rather than individualized clinical documentation. Insufficient differentiation between sessions undermines clinical validity and compliance.",\n      "points_deducted": 0\n    }\n  ],\n  "individual_section_evaluations": {\n    "session_duration": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Identical to previous note - raises documentation integrity concerns"\n    },\n    "mental_status": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Copied from previous note - Critical violation"\n    },\n    "subjective": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Substantially copied with superficial modifications - Critical violation"\n    },\n    "objective": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Verbatim copy from previous note - Critical violation"\n    },\n    "assessment_intervention": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Substantially copied therapeutic approach - Critical violation"\n    },\n    "reaction_to_intervention": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Copied from previous note with minimal variation - Critical violation"\n    },\n    "plan_collaboration": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Substantially copied structure and content - Critical violation"\n    },\n    "progress": {\n      "status": "FLAGGED",\n      "compliance": "FAIL",\n      "note": "Vague rating lacking measurable outcomes or clinical specificity"\n    },\n    "therapist_credentials": {\n      "status": "COMPLIANT",\n      "compliance": "PASS",\n      "note": "Properly documented with credentials (LMHC, R.V.C)"\n    }\n  }\n}\n```\n\n**CRITICAL FINDINGS:**\nThis note exhibits systematic copying from the previous session with insufficient individualization. Seven of nine clinical sections are flagged as copied or substantially duplicated content. This represents a fundamental documentation compliance failure that compromises clinical validity, legal defensibility, and quality of care documentation.\n\n**RECOMMENDATION:** Note should be rejected and rewritten with individualized clinical content specific to this session.',
      // }

      // const text = {
      //   section: 'aggregator',
      //   response:
      //     '```json\n{\n  "score": 50,\n  "pass": false,\n  "sentiment": "Critical compliance failure due to extensive content duplication",\n  "summary": "Current note contains multiple sections that are directly copied or substantially duplicated from the previous note, representing critical documentation violations. Significant portions of the Assessment & Therapeutic Intervention, Objective, and Reaction to Intervention sections are identical or near-identical between sessions, suggesting inadequate individualization of clinical documentation.",\n  "evaluation": "This note fails to meet basic clinical documentation standards. While the current session shows different clinical content (anxious presentation vs. calm presentation, relationship challenges vs. progress exploration), the therapeutic documentation is largely replicated from the previous session. This violates the fundamental requirement that each clinical note independently and accurately document that specific session\'s unique clinical events, interventions, and responses.",\n  "issues": [\n    {\n      "section": "Objective",\n      "severity": "Critical",\n      "points_deducted": 25,\n      "description": "Copied from previous note - identical language: \'Client was engaged and interactive during the session.\' This exact phrase appears in both sessions without modification, suggesting template copying rather than individualized observation."\n    },\n    {\n      "section": "Assessment & Therapeutic Intervention",\n      "severity": "Critical",\n      "points_deducted": 25,\n      "description": "Substantially copied from previous note - nearly identical language regarding \'person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard.\' While current note mentions \'somatic exercises\' and previous mentions \'DBT mindfulness skills,\' the core intervention description is duplicated verbatim."\n    },\n    {\n      "section": "Reaction to Intervention",\n      "severity": "Critical",\n      "points_deducted": 25,\n      "description": "Copied from previous note - \'Client was receptive and interactive throughout the duration of the session\' mirrors previous session\'s \'Client was receptive to education\' with nearly identical framing, suggesting template use rather than individualized clinical observation."\n    },\n    {\n      "section": "Mental Status Examination",\n      "severity": "Major",\n      "points_deducted": 10,\n      "description": "Incomplete documentation - Mental Status section is marked optional but contains only safety screening (Suicidality/Homicidality). No assessment of mood, affect, thought process, orientation, or cognitive functioning documented despite client presenting \'in an anxious manner.\'"\n    },\n    {\n      "section": "Therapist Reflection and Insight",\n      "severity": "Major",\n      "points_deducted": 5,\n      "description": "Section is blank/missing - No therapist reflection, clinical reasoning, or insight documented. This section is marked optional but when omitted entirely, reduces clinical depth and accountability."\n    },\n    {\n      "section": "Session Inconsistency",\n      "severity": "Moderate",\n      "points_deducted": 5,\n      "description": "Both sessions show identical duration (10am-10:53am) and identical therapist initials. While possible, the combination with extensive duplication raises documentation integrity concerns."\n    }\n  ],\n  "individual_section_evaluations": {\n    "session_duration": {\n      "status": "documented",\n      "note": "10am-10:53am (53 minutes) - matches previous session exactly"\n    },\n    "mental_status": {\n      "status": "incomplete",\n      "compliance": "Fails - only safety screening present; no mood, affect, or cognitive assessment despite anxious presentation"\n    },\n    "suicidality_homicidality": {\n      "status": "documented",\n      "compliance": "Pass - appropriately screened"\n    },\n    "subjective": {\n      "status": "documented_but_vague",\n      "compliance": "Partial - describes presentation and general topics but lacks specific clinical detail; no direct quotes or specific relationship challenges identified"\n    },\n    "objective": {\n      "status": "copied_violation",\n      "compliance": "Fail - identical to previous note"\n    },\n    "assessment_and_intervention": {\n      "status": "substantially_duplicated",\n      "compliance": "Fail - core intervention description copied from previous note with only minor modification of specific skills taught"\n    },\n    "reaction_to_intervention": {\n      "status": "copied_violation",\n      "compliance": "Fail - substantially identical language to previous note"\n    },\n    "plan_and_collaboration": {\n      "status": "documented",\n      "compliance": "Pass - specific plan documented (weekly sessions, yoga class); differs from previous note"\n    },\n    "progress_rating": {\n      "status": "documented",\n      "compliance": "Pass - rated as \'Moderate progress\' (differs from previous \'Some progress\')"\n    },\n    "therapist_signature": {\n      "status": "documented",\n      "compliance": "Pass - Raquel Castello, LMHC, R.V.C properly identified"\n    }\n  }\n}\n```',
      // }

      const text = {
        section: 'subjective',
        response:
          '```json\n{\n  "score": 55,\n  "pass": false,\n  "issues": [\n    {\n      "points_deducted": 15,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Overly definitive diagnostic language without attribution. The phrase \'The client presented in an anxious manner\' is a clinician observation and interpretation, not a client-reported experience. Should be attributed to client report (e.g., \'Client reported feeling anxious\' or \'Client described anxiety symptoms\')."\n    },\n    {\n      "points_deducted": 15,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Vague and generic phrasing that does not reflect the client\'s lived experience. \'Recent challenges within her relationship,\' \'worries and fears,\' and \'was vocal in the session\' lack specificity. No details about the nature of relationship challenges, specific worries/fears, or what the client actually expressed."\n    },\n    {\n      "points_deducted": 15,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Client voice is minimized and replaced with clinician framing. The entire section describes what the client \'was able to\' do or how she \'presented\' rather than what the client actually reported about her experience, thoughts, emotions, or concerns. No direct or paraphrased client statements present."\n    },\n    {\n      "points_deducted": 5,\n      "section_id": "6tx9-1",\n      "section": "Subjective",\n      "justification": "Medical necessity is not clearly established. The Subjective section does not articulate why the client is in treatment, what symptoms or stressors prompted this session, or what clinical concerns the client brought. This weakens billing defensibility and treatment justification."\n    }\n  ],\n  "summary": "The Subjective section is clinician-centered and lacks essential client-reported detail. It describes the therapist\'s observations of the client\'s presentation and behavior rather than documenting the client\'s own experience, concerns, and perspective. To meet clinical documentation standards, this section should include: (1) specific relationship challenges the client described, (2) the particular worries and fears she expressed (attributed to her report), (3) her emotional experience in her own words or clear paraphrase, and (4) context for medical necessity. The current documentation is too generic and could apply to multiple clients across multiple sessions, reducing clinical specificity and billing defensibility."\n}\n```',
      }

      console.log('text', text)
      // Extract JSON content from markdown code blocks if present
      const jsonMatch = text.response.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1])
      }
      return JSON.parse(text.response) // fallback for plain JSON
    } catch (error) {
      console.log('chat output aggregation error', error)
      return ErrorService.handleError(ctx, error)
    }
  }
}
