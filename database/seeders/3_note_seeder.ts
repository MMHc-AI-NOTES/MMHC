import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Session from '#models/session'
import {
  SessionTypeEnum,
  AiStatusEnum,
  HumanReviewEnum,
  ManagerEnum,
  WorkflowEnum,
  PriorityEnum,
} from '#enums/session_enum'

export default class extends BaseSeeder {
  async run() {
    try {
      const sessionsData = [
        {
          noteId: '4b2e90f4-23e7-42fa-b106-cd0b9854701c',
          sessionId: 'session-1',
          session:
            'Session Duration: 3pm-4pm  \n\nSuicidality: Denied  \n\nHomicidality: Not reported  \n\nSubjective: The client was able to process their anxiety provoking thoughts and explore cbt tools they can turn to.  \n\nObjective: Client was engaged and interactive during the session.  \n\nAssessment & Therapeutic Intervention: Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. The client was able to explore how the increase in their socialization has been helpful for their mood and energy.  \n\nReaction to Intervention: The client was receptive and interactive throughout the duration of the session and responded well to all interventions provided by the therapist.  \n\nPlan and Collaboration: The client to continue to practice cbt tools and to document their thoughts.  \n\nProgress: Progress (Minimal)  \n\nTherapist Initials: Raquel Castello, LMHC, R.V.C',
          practitionerId: 2,
          patientId: 1,
        },
        {
          noteId: '9898709-a7aa-789-af0e-693c1b9f6714',
          sessionId: 'session-2',
          session:
            'Session Duration: 11:02 am - 11:58 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Ming reported experiencing significant frustration with Adderall prescription access for three weeks and needing to reach out to another pharmacy. In this session Ming focused on her disconnect between short-term and long-term memory and described difficulty recalling information despite knowing it exists. She explored struggles with "now and not now" thinking pattern affecting task completion. Ming reported a tendency to suppress preferences while expecting others to consider needs and described a pattern of resentment after accommodating others that she would like to work on.  \n\nObjective: Ming presented with euthymic mood and congruent affect. She was engaged throughout session and demonstrated insight into behavioral patterns.  \n\nAssessment & Therapeutic Intervention: This writer provided psychoeducation on memory and attention difficulties related to ADHD symptoms. Session then focused on addressing friendship dynamics and patterns of accommodation followed by resentment. This writer explored with client her tendency toward people-pleasing behaviors and subsequent negative feelings and encouraged mindfulness regarding decision-making in social situations.  \n\nReaction to Intervention: Client was receptive to psychoeducation and showed interest in exploring underlying purpose of resentment patterns.  \n\nPlan and Collaboration: Therapist and client to meet next week. Client to practice mindfulness regarding emotions without judgment, acknowledging responsibility for choices in social situations and journaling to process insights and reduce rumination.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AT',
          practitionerId: 2,
          patientId: 2,
        },
        {
          noteId: '73824299-a7aa-4313-af0e-693c1b9f6714',
          sessionId: 'session-3',
          session:
            'Session Duration: 11:02 am – 11:58 am\n\n\n\nSuicidality: Not Present\n\n\n\nHomicidality: Not Present\n\n\n\nSubjective: Ming reported experiencing significant frustration with Adderall prescription access for three weeks and needing to reach out to another pharmacy. In this session Ming focused on her disconnect between short-term and long-term memory and described difficulty recalling information despite knowing it exists. She explored struggles with "now and not now" thinking pattern affecting task completion. Ming reported a tendency to suppress preferences while expecting others to consider needs and described a pattern of resentment after accommodating others that she would like to work on.\n\n\n\nObjective: Ming presented with euthymic mood and congruent affect. She was engaged throughout session and demonstrated insight into behavioral patterns.\n\n\n\nAssessment & Therapeutic Intervention: This writer provided psychoeducation on memory and attention difficulties related to ADHD symptoms. Session then focused on addressing friendship dynamics and patterns of accommodation followed by resentment. This writer explored with client her tendency toward people-pleasing behaviors and subsequent negative feelings and encouraged mindfulness regarding decision-making in social situations.\n\n\n\nReaction to Intervention: Client was receptive to psychoeducation and showed interest in exploring underlying purpose of resentment patterns.\n\n\n\nPlan and Collaboration: Therapist and client to meet next week. Client to practice mindfulness regarding emotions without judgment, acknowledging responsibility for choices in social situations and journaling to process insights and reduce rumination.\n\n\n\nProgress: Progress\n\n\n\nTherapist Initials: AT',
          practitionerId: 2,
          patientId: 3,
        },
      ]

      for (const sessionData of sessionsData) {
        await Session.updateOrCreate(
          {
            noteId: sessionData.noteId,
            sessionId: sessionData.sessionId,
          },
          {
            noteId: sessionData.noteId,
            sessionId: sessionData.sessionId,
            session: sessionData.session,
            practitionerId: sessionData.practitionerId,
            patientId: sessionData.patientId,
            type: SessionTypeEnum.default,
            aiScore: null,
            aiStatus: AiStatusEnum.not_reviewed,
            humanReview: HumanReviewEnum.pending,
            manager: ManagerEnum.not_needed,
            workflow: WorkflowEnum.in_queue,
            priority: PriorityEnum.low,
          }
        )
      }
    } catch (error) {
      console.log(`Error in seeding sessions: ${error}`)
      throw error
    }
  }
}
