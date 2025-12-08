import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Session from '#models/session'
import CptCode from '#models/cpt_code'
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
          type: SessionTypeEnum.progress_note,
        },
        {
          noteId: '9898709-a7aa-789-af0e-693c1b9f6714',
          sessionId: 'session-2',
          session:
            'Session Duration: 11:02 am - 11:58 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Ming reported experiencing significant frustration with Adderall prescription access for three weeks and needing to reach out to another pharmacy. In this session Ming focused on her disconnect between short-term and long-term memory and described difficulty recalling information despite knowing it exists. She explored struggles with "now and not now" thinking pattern affecting task completion. Ming reported a tendency to suppress preferences while expecting others to consider needs and described a pattern of resentment after accommodating others that she would like to work on.  \n\nObjective: Ming presented with euthymic mood and congruent affect. She was engaged throughout session and demonstrated insight into behavioral patterns.  \n\nAssessment & Therapeutic Intervention: This writer provided psychoeducation on memory and attention difficulties related to ADHD symptoms. Session then focused on addressing friendship dynamics and patterns of accommodation followed by resentment. This writer explored with client her tendency toward people-pleasing behaviors and subsequent negative feelings and encouraged mindfulness regarding decision-making in social situations.  \n\nReaction to Intervention: Client was receptive to psychoeducation and showed interest in exploring underlying purpose of resentment patterns.  \n\nPlan and Collaboration: Therapist and client to meet next week. Client to practice mindfulness regarding emotions without judgment, acknowledging responsibility for choices in social situations and journaling to process insights and reduce rumination.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AT',
          practitionerId: 3,
          patientId: 2,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '73824299-a7aa-4313-af0e-693c1b9f6715',
          sessionId: 'session-3',
          session:
            'Session Duration: 11:02 am – 11:58 am\n\n\n\nSuicidality: Not Present\n\n\n\nHomicidality: Not Present\n\n\n\nSubjective: Ming reported experiencing significant frustration with Adderall prescription access for three weeks and needing to reach out to another pharmacy. In this session Ming focused on her disconnect between short-term and long-term memory and described difficulty recalling information despite knowing it exists. She explored struggles with "now and not now" thinking pattern affecting task completion. Ming reported a tendency to suppress preferences while expecting others to consider needs and described a pattern of resentment after accommodating others that she would like to work on.\n\n\n\nObjective: Ming presented with euthymic mood and congruent affect. She was engaged throughout session and demonstrated insight into behavioral patterns.\n\n\n\nAssessment & Therapeutic Intervention: This writer provided psychoeducation on memory and attention difficulties related to ADHD symptoms. Session then focused on addressing friendship dynamics and patterns of accommodation followed by resentment. This writer explored with client her tendency toward people-pleasing behaviors and subsequent negative feelings and encouraged mindfulness regarding decision-making in social situations.\n\n\n\nReaction to Intervention: Client was receptive to psychoeducation and showed interest in exploring underlying purpose of resentment patterns.\n\n\n\nPlan and Collaboration: Therapist and client to meet next week. Client to practice mindfulness regarding emotions without judgment, acknowledging responsibility for choices in social situations and journaling to process insights and reduce rumination.\n\n\n\nProgress: Progress\n\n\n\nTherapist Initials: AT',
          practitionerId: 4,
          patientId: 3,
          type: SessionTypeEnum.treatment_plan,
        },
        {
          noteId: '73824299-a7aa-4313-af0e-693c1b9f6714',
          sessionId: 'session-4',
          session: `Session Duration: 11:02 am - 11:58 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Ming reported experiencing significant frustration with Adderall prescription access for three weeks and needing to reach out to another pharmacy. In this session Ming focused on her disconnect between short-term and long-term memory and described difficulty recalling information despite knowing it exists. She explored struggles with "now and not now" thinking pattern affecting task completion. Ming reported a tendency to suppress preferences while expecting others to consider needs and described a pattern of resentment after accommodating others that she would like to work on.  \n\nObjective: Ming presented with euthymic mood and congruent affect. She was engaged throughout session and demonstrated insight into behavioral patterns.  \n\nAssessment & Therapeutic Intervention: This writer provided psychoeducation on memory and attention difficulties related to ADHD symptoms. Session then focused on addressing friendship dynamics and patterns of accommodation followed by resentment. This writer explored with client her tendency toward people-pleasing behaviors and subsequent negative feelings and encouraged mindfulness regarding decision-making in social situations.  \n\nReaction to Intervention: Client was receptive to psychoeducation and showed interest in exploring underlying purpose of resentment patterns.  \n\nPlan and Collaboration: Therapist and client to meet next week. Client to practice mindfulness regarding emotions without judgment, acknowledging responsibility for choices in social situations and journaling to process insights and reduce rumination.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AT`,
          practitionerId: 3,
          patientId: 4,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '73824299-a7aa-4313-af0e-693c1b9f6713',
          sessionId: 'session-5',
          session: `Session Duration: 11:00 am - 11:54 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client reported having a social two weeks with multiple social experiences and attended concert alone in local park, experienced multiple interactions with strangers. Ming described that after this experience she noticed exhaustion from negative thought patterns and self-criticism. Client discussed her relationship expectations with partner regarding emotional support and communication styles. She shared disappointment in her partner's difficulty with planning activities and follow-through on commitments.  \n\nObjective: Client presented with euthymic mood and engaged in detailed self-reflection about social experiences.  \n\nAssessment & Therapeutic Intervention: Client demonstrates heightened social anxiety with negative thought patterns affecting daily functioning and shows good self-awareness regarding impact of assumptions and catastrophic thinking. Therapist encouraged continued focus on recognizing and challenging negative automatic thoughts. Therapist began exploring with client how her relationship concerns center on communication styles and unmet emotional needs.  \n\nReaction to Intervention: Client was receptive and demonstrated willingness to examine thought patterns and relationship dynamics.  \n\nPlan and Collaboration: Therapist and client will meet next week to continue exploring relationship unmet needs. Client to continue working on identifying and challenging negative thought patterns.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AT`,
          practitionerId: 3,
          patientId: 4,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '9397b533-81c0-481e-b49c-909dae7fcadd',
          sessionId: 'session-6',
          session: `Session Duration: 3:00 pm - 3:54 pm  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: In this session Flory reported ongoing stress and feeling tired constantly. She shared that there was recently a flood in the apartment she shares with her daughter which has put many of her plans on hold. Flory brought up the ailing health of her current client and reported difficulty with death and grief. She shared a tendency to distance self from dying individuals. She explored unresolved grief regarding father's death and lack of family support. Flory also discussed her relationship with her sister, who has bipolar disorder, and shared experiences of her sister being emotionally abusive.  \n\nObjective: Client presented as overwhelmed due to recent stressors. Client was engaged throughout session.  \n\nAssessment & Therapeutic Intervention: This session focused on exploring patterns of grief avoidance and family dynamics. Therapist and client discussed client's experience of losing her father and his family members while not having her mother or sister for support. Flory explored her relationship with her sister, whom she described as "wanting to see me experience pain and lose my composure". She related this experience to how she processes and experiences her own feelings now.  \n\nReaction to Intervention: Client was receptive to exploration and demonstrated insight into sister's jealousy and lack of reciprocity.  \n\nPlan and Collaboration: Client and therapist will meet next week and continue processing grief and family relationship patterns.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AT`,
          practitionerId: 3,
          patientId: 5,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '9397b533-81c0-481e-b49c-909dae7fcadc',
          sessionId: 'session-7',
          session: `Session Duration: 3:05 pm - 4:00 pm  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Flory reported feeling a little sleepy but overall good. Client discussed ongoing housing challenges with her daughter. Client described her daughter becomes very distressed when feeling cornered or stuck. Client reported ongoing caregiving stress with elderly client who requires constant supervision and assistance. Flory described feeling overwhelmed by continuous caregiving demands with little to no breaks. She reported ongoing employment challenges in the caregiving field and discussed the exploitation and abuse common in home care industry, including at her current job.  \n\nObjective: Client appeared euthymic and engaged throughout session. Client demonstrated clear thought process when discussing complex family dynamics and caregiving challenges.  \n\nAssessment & Therapeutic Intervention: Client demonstrates resilience and problem-solving abilities while navigating complex family dynamics and advocating for appropriate boundaries. Therapeutic discussion focused on validating Client's caregiving burden and exploring strategies for managing overwhelming responsibilities. This writer provided psychoeducation regarding caregiver stress and importance of self-care.  \n\nReaction to Intervention: Client responded well to validation of caregiving challenges and expressed relief at having concerns acknowledged. Client engaged actively in discussion about boundary setting and demonstrated good understanding of need for self-advocacy in both family and employment situations.  \n\nPlan and Collaboration: Therapist and client will continue to meet weekly to monitor stress levels related to caregiving responsibilities and family dynamics. Explore additional coping strategies for managing overwhelming daily demands.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AT`,
          practitionerId: 3,
          patientId: 5,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '817ac79e-c818-41b9-bcea-54aab75042e5',
          sessionId: 'session-8',
          session: `Session Duration: 9:00 am - 10:00 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: PT reports that this has been a better week for him and that he has felt that it has been easier for him to wake up and start his Day lately compared to the way that he has been feeling for the past few weeks. PT discussed his homework activity and shared his core values and how important they are to him. PT began to create a behavioral activation plan where he can incorporate at least three core values related activities in his daily life.  \n\nObjective: Pt is engaged in session and oriented x3.  \n\nAssessment & Therapeutic Intervention: Therapist asked explorative questions and validated pt's feelings utilizing unconditional positive regard. Therapist discussed ways PT can learn and implement calming skills to reduce overall anxiety and manage anxiety symptoms. Therapist discussed PT's core values and assisted him in creating a behavioral activation plan.  \n\nReaction to Intervention: Pt is responsive to interventions overall. Pt actively processes his feelings/thoughts in the session, often taking pauses to reflect on what was said as well as to take deep breaths. Pt demonstrates resilience and an ability to find purpose and meaning. Pt reports he is interested in continuing to develop a behavioral activation plan.  \n\nPlan and Collaboration: Pt's homework is to continue working on his BA plan; make activities list.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AW`,
          practitionerId: 5,
          patientId: 6,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '817ac79e-c818-41b9-bcea-54aab75042e4',
          sessionId: 'session-9',
          session: `Session Duration: 10:00 am - 11:00 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Patient reports that he had a nice time with his brother and felt he went "soul searching." Patient reports feeling a bit "different" and generally pretty good. Patient described feeling whole again and felt he needed that time to understand himself. Patient shared recent interactions with his ex-girlfriend and processed his emotions, thoughts and behaviors about them.  \n\nObjective: Pt is engaged in session and oriented x3.  \n\nAssessment & Therapeutic Intervention: Therapist validated patient’s emotions and utilized unconditional positive regard. Therapist assisted patient in verbalizing and understanding the cognitive, physiological, and behavioral components of anxiety. Therapist challenged patient's minimization of his feelings and denial of emotions.  \n\nReaction to Intervention: Patient is receptive to interventions. Patient responded well to being challenged by therapist. Patient is able to recognize that he has stronger emotions than he would like to admit.  \n\nPlan and Collaboration: Patient will continue to focus on himself, exploring the difference between potential and reality.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AW`,
          practitionerId: 5,
          patientId: 6,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '6a3e4239-bd1a-4f0a-8e4a-7c8e88f4f21f',
          sessionId: 'session-10',
          session: `Session Duration: 8:00 am - 9:00 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Patient reports that she has been lethargic, mainly due to the hot weather lately. Patient discussed her career goals and how they tie to her educational goals. Weighed pros and cons of different career/education paths.  \n\nObjective: Pt appears comfortable and engaged in session.  \n\nAssessment & Therapeutic Intervention: Therapist utilized unconditional positive regard and actively listened as pt shared about her vision board, asking explorative questions. Therapist engaged in career counseling. Therapist assisted patient in weighing pros and cons of different potential career/educational paths based on her personality and personal interests.  \n\nReaction to Intervention: Pt was receptive to interventions. Pt is a skilled communicator and expresses herself very well. Pt shares her experiences openly and clearly. Pt is open to reframing and responds well to strengths based approaches. Patient demonstrates ability to consider multiple paths and prioritize the ones that best suit her own personal needs.  \n\nPlan and Collaboration: Patient will do research on finding dual degree opportunities for social work and psychology.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AW`,
          practitionerId: 5,
          patientId: 7,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '6a3e4239-bd1a-4f0a-8e4a-7c8e88f4f21e',
          sessionId: 'session-11',
          session: `Session Duration: 8:00 am - 9:00 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Patient reports that she has been enrolling in classes for her grad school/PhD program. Patient described technical and logistical struggles that are getting in her way, including potential barriers regarding her work schedule that may impede her from being able to go to school. Patient discussed possible solutions and alternatives. Patient processed the political climate in the United States and the way that it is affecting her and her family. Patient discussed the tumultuous and volatile ways her life and her family’s lives are being affected. Patient reports feeling it is difficult for her to plan for the future because of this.  \n\nObjective: Pt appears comfortable and engaged in session.  \n\nAssessment & Therapeutic Intervention: Therapist utilized unconditional positive regard and asked explorative questions throughout the session. Therapist and patient processed the political climate of the country and the way that it is affecting her and her family. Patient shared and explored more about her family dynamics and the expectations that weigh on her due to cultural factors. Therapist and patient discussed the possibilities and impacts of potentially moving out. Assisted patient in identifying thoughts, emotions, and behaviors associated with the political climate.  \n\nReaction to Intervention: Patient is responsive to interventions overall. Patient engaged thoughtfully throughout the session. Patient demonstrates effective ability to reflect and be introspective. Patient is able to express her emotions of anxiety and stress, but tends to see things very matter-of-factly.  \n\nPlan and Collaboration: Patient will continue exploring potential moving/going to school possibilities as she focuses on her future to better herself and reduce her symptoms of depression.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AW`,
          practitionerId: 5,
          patientId: 7,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '6867b209-bb73-4608-8880-1e045e117d36',
          sessionId: 'session-12',
          session: `First Name: Wendy  \n\nSession Duration: 6:00 pm - 6:53 pm  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: The client reports that she has been dealing with some stress/low mood and is trying to create things to look forward to. Discussed tension with friend and difficulty with setting boundaries.  \n\nObjective: The client was alert and cooperative during the session, and her behavior was appropriate to the setting.  \n\nAssessment & Therapeutic Intervention: Worked on identifying things that the client can do for relaxation/self-care to improve mood, as well as planning things to look forward to in the future. Discussed conflict the client is experiencing with her friend: discussed how giving too much to others/not setting boundaries leads to feelings of frustration and resentment, and explored ways to improve communication.  \n\nReaction to Intervention: Positive.  \n\nPlan and Collaboration: Discuss the client's progress with improving assertiveness and standing up for herself/establishing boundaries; discuss progress prioritizing herself and taking time for relaxation.  \n\nProgress: Progress (The client is making progress trying to focus on the positives and find things to look forward to.)  \n\nTherapist Initials: AJ`,
          practitionerId: 6,
          patientId: 8,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '34914133-3c6c-4f04-a275-e0fde9317e00',
          sessionId: 'session-13',
          session: `First Name: James  \n\nLast Name: Piela  \n\nSession Duration: 11:00 am - 11:53 am  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: The client reports that he has still been dealing with some stress, but overall things are going well and he's feeling confident in his ability to cope with it. Discussed how to feel prepared for uncertainty and finding ways to feel empowered rather than helpless.  \n\nObjective: The client was alert and cooperative during the session, and his behavior was appropriate to the setting.  \n\nAssessment & Therapeutic Intervention: Discussed how the client has been coping with stress and feeling more confident that he has the tools to manage it. Discussed ways for the client to feel more prepared and cultivate a sense of empowerment/agency.  \n\nReaction to Intervention: Positive; the client feels confident in his coping skills.  \n\nPlan and Collaboration: Continue to discuss the client's progress with managing anxiety and coping with current stressors; continue to discuss building confidence in himself and his practice, and focusing on what is within his control.  \n\nProgress: Progress (The client is making progress with feeling confident in his ability to cope with anxiety.)  \n\nTherapist Initials: AJ`,
          practitionerId: 6,
          patientId: 9,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'cf799158-fc0c-4ffb-aaab-a0c8dd2484f9',
          sessionId: 'session-14',
          session: `Session Duration: 12:00 pm - 12:53 pm  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Cx reports feelings of low motivation and being overly drained from daily stressors such as taking care of her child, working on her relationship with her partner, as well as work. Therapist and cx discuss feelings of burnout and how it impacts daily mood. A routine is created where the cx can maintain a consistent schedule and implement self-care.  \n\nObjective: Cx was engaged in session with eye contact, engaging in conversation, and providing insight throughout session.  \n\nAssessment & Therapeutic Intervention: Therapist utilized talk therapy to discuss the cx's stressors and ways to effectively cope. Therapist provided self-esteem building worksheets to allow the cx to plan how to navigate personal relationships, including her romantic relationship.  \n\nReaction to Intervention: Cx was very open and willing to try new therapeutic interventions and asked for mindfulness coping mechanisms. Therapist provided breathing techniques to assist with sleep and relaxation during extreme stress.  \n\nPlan and Collaboration: Therapist provided a mindfulness worksheet to assist with self-esteem building, breathing techniques, and DBT mindfulness videos. Routine building: working out, spending more time with her daughter, maintaining a consistent work schedule.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: A.S.`,
          practitionerId: 7,
          patientId: 10,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'cf799158-fc0c-4ffb-aaab-a0c8dd2484f8',
          sessionId: 'session-15',
          session: `Session Duration: 12:00 pm - 12:53 pm  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Cx reports improvement in her sleep this past week as she maintains her sleep routine and workout schedule. Therapist and cx now focus on boundary setting and compromise to reduce stress in her home environment and relationship with her partner—this has been a primary trigger for her anxiety. Therapist utilizes CBT and DBT mindfulness to support emotional regulation.  \n\nObjective: Cx was engaged in session with eye contact, engaging in conversation and providing insight throughout session.  \n\nAssessment & Therapeutic Intervention: Therapist utilized talk therapy to discuss stressors and effective coping strategies. Therapist provided self-esteem worksheets to support navigation of personal and romantic relationships.  \n\nReaction to Intervention: Cx was very open and willing to try new therapeutic interventions and asked for additional mindfulness coping mechanisms. Breathing techniques were provided to improve sleep and reduce stress.  \n\nPlan and Collaboration: Therapist provided mindfulness worksheets, breathing techniques, and DBT mindfulness videos. Routine building: working out, spending more time with her daughter, maintaining a consistent work schedule.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: A.S.`,
          practitionerId: 7,
          patientId: 10,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '95139808-e0cb-41ea-8db1-265c4d6098e5',
          sessionId: 'session-16',
          session: `Session Duration: 9:00 am - 9:53 am  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Cx discusses this past weekend being a struggle of emotions. Throughout session therapist and cx vocalize concerns about her interpersonal relationships and trust. Furthermore, therapist and cx unpack her current relationship and reasons she wants to keep this person.  \n\nHomework: self-esteem building exercise/relationship worksheet.  \n\nObjective: Client was attentive and open throughout session. She was actively engaged and maintained eye contact.  \n\nAssessment & Therapeutic Intervention: Therapist utilized DBT mindfulness as well as talk therapy throughout the session. During this time cx was able to understand perspective as well as dissect their emotions during conflict. Mindfulness was provided to effectively cope with stressors. Cx has noticed positive changes in interpersonal relationships and parenting.  \n\nReaction to Intervention: Cx was open to trying the mindfulness exercises and discussion throughout session.  \n\nPlan and Collaboration: Therapist and cx discuss the meaning of trauma response as well as implementing a feelings jar in her home and the possible benefits for the home and her son. Therapist provided mindfulness worksheets and psychoeducation on coping with feelings/trauma.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: A.S.`,
          practitionerId: 7,
          patientId: 11,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '95139808-e0cb-41ea-8db1-265c4d6098e4',
          sessionId: 'session-17',
          session: `Session Duration: 12:00 pm - 12:53 pm  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Cx reports feelings of frustration and anger when being the primary supportive parent for her child. Therapist and cx discuss emotional regulation and de-escalation strategies for handling personal feelings toward the father of her child. Session also included parenting education and ways to effectively provide positive reinforcement for her child.  \n\nObjective: Client was attentive and open throughout session. She was actively engaged and maintained eye contact.  \n\nAssessment & Therapeutic Intervention: Therapist utilized DBT mindfulness and talk therapy, enabling cx to understand perspective and dissect emotions during conflict. Mindfulness exercises were provided to cope with stressors; cx has observed benefits in interpersonal relations and parenting.  \n\nReaction to Intervention: Cx was open to trying mindfulness exercises and discussion throughout session.  \n\nPlan and Collaboration: Therapist and cx discussed trauma response and implementing a feelings jar at home; therapist provided mindfulness worksheets and psychoeducation on coping/trauma.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: A.S.`,
          practitionerId: 7,
          patientId: 11,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'b9521ac5-9919-4baa-8a1c-7100a97511f6',
          sessionId: 'session-18',
          session: `Session Duration: 2:32 pm - 3:32 pm (60 minutes)  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client is seeing this particular work experience similarly to past ones, with common themes emerging. Client opened the session with a sense of urgency, stating "I need your email".  \n\nObjective: Client made good eye contact during the session. She was focused on deciding how to approach her employer about elevating her position to Lead Hostess.  \n\nAssessment & Therapeutic Intervention: Therapist used mirroring, attunement, talk therapy skills, Solution Focused approach, and Socratic questioning to clarify emotions, thoughts, and meanings Client is attaching to the new job opportunity. Therapist stayed attuned to familiar patterns in Client's reactions and clarified what kind of help she needs.  \n\nReaction to Intervention: Client identified needing help with her decision about training, given another pending job offer. Her response to the new opportunity was anger. Client stated her goals: securing the highest hourly rate possible and concerns about unpredictable hours. She identified themes similar to past jobs: 1) Employer expects too much for the money offered. 2) They make a simple job overly complicated. 3) She dislikes being micro-managed. She finalized a plan of action.  \n\nPlan and Collaboration: Continue exploring these themes and ensure Client’s actions align with her goals.  \n\nTherapist Reflection and Insight (optional): Client’s reactions are tied to childhood gaslighting, early hyper-independence, and frustration with inconsistent, confusing parental behavior.  \n\nProgress: Progress  \n\nTherapist Initials: GCB`,
          practitionerId: 4,
          patientId: 12,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'b9521ac5-9919-4baa-8a1c-7100a97511f5',
          sessionId: 'session-19',
          session: `Session Duration: 10:00 am - 11:00 am (60 minutes)  \n\nMental Status (optional):   \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client sublimates emotions in order to move forward with her life, continuing to seek support from those capable and those who are not. The session focused on applying an attachment and trauma-focused lens to Client's interpersonal behavior.  \n\nObjective:   \n\nAssessment & Therapeutic Intervention:   \n\nReaction to Intervention:   \n\nPlan and Collaboration:   \n\nTherapist Reflection and Insight (optional):   \n\nProgress:   \n\nTherapist Initials: `,
          practitionerId: 4,
          patientId: 12,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'cc9c3442-f17c-4b84-8391-c165ca8df881',
          sessionId: 'session-20',
          session: `Session Duration: 2:01 pm - 2:55 pm (54 minutes)  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client presents as engaged and animated. She was particularly conflicted due to visits from three family members this week. The session focused on family dysfunction and drama and how Client can best navigate it.  \n\nObjective: Client made good eye contact during the session.  \n\nAssessment & Therapeutic Intervention: Therapist followed up on Client's experience thus far with TMS, and then used mirroring, attunement, talk therapy skills, positive reinforcement of boundary setting, and Socratic questioning to facilitate Client's narrative.  \n\nReaction to Intervention: Client is hopeful about TMS but is reserving judgment. She is 10 days in. Client identified the most difficult family situation to navigate and was receptive to Therapist's suggested strategy. She recognizes that she cannot change her brothers' dysfunction and is setting boundaries.  \n\nPlan and Collaboration: Use EMDR resourcing while waiting to resume post-TMS.  \n\nProgress: Progress  \n\nTherapist Initials: GCB`,
          practitionerId: 4,
          patientId: 13,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'cc9c3442-f17c-4b84-8391-c165ca8df880',
          sessionId: 'session-21',
          session: `Session Duration: 4:02 pm - 5:03 pm (61 minutes)  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client presents with Moderate Depression. She reports meeting with the psychiatrist overseeing her TMS treatment. Due to non-efficacy at mid-point, he prescribed 10 weeks of Theta Bursts in addition to TMS. Client preferred to start EMDR today.  \n\nObjective: Client presented with tears and expressive affect during the desensitization phase.  \n\nAssessment & Therapeutic Intervention: Therapist obtained informed consent to begin EMDR processing. Therapist conducted EMDR Assessment, EMDR Desensitization of the “worst part” of the “Pete” experience using Standard Protocol, and Closure using the Container Exercise.  \n\nReaction to Intervention: Therapist chose not to identify a Positive Cognition due to prior unproductive rumination. Client identified emotions including anxiety, disgust, fear, confusion, and horror in her chest. Client moved toward adaptive resolution and stated during feedback, “I want to be there.” She reported feeling enclosed “in a good way.” She experienced brief spinning which slowed. She was unable to re-rate the incident due to reduced accessibility. Client achieved positive state change with Container and tapped it in. Client was informed of Therapist’s upcoming absence and chose to proceed with EMDR anyway. She expressed surprise at her emotional and positive reaction to EMDR.  \n\nPlan and Collaboration: Continue processing on July 15. Client may schedule with a different therapist during this therapist’s absence (July 21–28).  \n\nProgress: Progress  \n\nTherapist Initials: GCB`,
          practitionerId: 4,
          patientId: 13,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '505f2079-107c-4ce0-aa3e-95e88621c461',
          sessionId: 'session-22',
          session: `Session Duration: 9:00 am - 9:53 am (53 minutes)  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nObjective: Client was alert and engaged in therapy.  \n\nAssessment & Therapeutic Intervention: Talk therapy, active listening.  \n\nReaction to Intervention: Client reacted positively and was open to intervention.  \n\nPlan and Collaboration: Client will be mindful of topics explored in today's session.  \n\nProgress: Progress  \n\nTherapist Initials: AL`,
          practitionerId: 8,
          patientId: 14,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '505f2079-107c-4ce0-aa3e-95e88621c460',
          sessionId: 'session-23',
          session: `Session Duration: 9:00 am - 9:38 am (38 minutes)  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client is doing alright. Client has been trying to make the most out of the summer. Client is trying to make more plans for the summer before college starts.  \n\nObjective: Client was alert and engaged in therapy.  \n\nAssessment & Therapeutic Intervention: Talk therapy, active listening, future planning, coping skills, planning.  \n\nReaction to Intervention: Client reacted positively and was open to intervention.  \n\nPlan and Collaboration: Client will be mindful of topics explored in today's session.  \n\nProgress: Progress  \n\nTherapist Initials: AL`,
          practitionerId: 8,
          patientId: 14,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '41252364-7674-4f54-adec-2a23991b4394',
          sessionId: 'session-24',
          session: `Session Duration: 2:00 pm - 2:53 pm (53 minutes)  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client shared that the first weekend of shows went well. She is looking forward to the next weekend. Notes no major mistakes which felt good. Her sister may come next weekend, which she is excited about. Some new potential auditions are feeling exciting.  \n\nObjective: Client was alert and engaged in session.  \n\nAssessment & Therapeutic Intervention: Talk therapy, active listening, coping skills, CBT, positive self-talk.  \n\nReaction to Intervention: Client was open to intervention and reacted positively.  \n\nPlan and Collaboration: Client will be mindful of topics explored in today's session.  \n\nProgress: Progress  \n\nTherapist Initials: AL`,
          practitionerId: 8,
          patientId: 15,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'f19e007b-fe0e-49bd-b79f-8f911de2e1a4',
          sessionId: 'session-25',
          session: `Session Duration: 53 minutes  \n\nMental Status (optional):   \n\nSuicidality: Denied  \n\nHomicidality: None  \n\nSubjective: Client presented as overwhelmed, anxious, and frustrated during the session. They reported ongoing difficulties with their housing case, experiencing what they describe as targeted interference with their electronics, including security cameras and Wi-Fi. The client expressed concern that their devices were being monitored or tampered with while they were away at court, resulting in feelings of fear and a perceived lack of control. Client also described issues with work scheduling, noting that new employees were being given priority over them, which they interpreted as a deliberate exclusion. Client expressed exhaustion and concern about being lost in the system, and shared how disorganized or hostile systems (legal, employment) contribute to rising stress. Client reports current emotional distress but is still maintaining appointments and trying to remain proactive, including seeking legal representation.  \n\nObjective: Client appeared fatigued and emotionally dysregulated, with speech mildly disorganized at times, jumping between legal, housing, and employment concerns. Despite elevated anxiety and confusion, client was oriented to person, time, and place. Thought content reflected themes of persecution and mistrust, though insight and reality testing were generally intact. Client demonstrated a desire for advocacy and problem-solving, indicating retained motivation. No suicidal or homicidal ideation reported.  \n\nAssessment & Therapeutic Intervention: The client appears to be experiencing moderate to severe anxiety exacerbated by systemic stressors (housing court, employment instability, perceived surveillance) and possible trauma-related hypervigilance. Interventions included validation, psychoeducation on anxiety triggers, grounding techniques, cognitive reframing, case-management support, and empowerment-focused interventions. Client was encouraged to journal intrusive thoughts, document incidents, and continue legal advocacy.  \n\nReaction to Intervention: Client appeared receptive to validation and psychoeducation, though continued to express fatigue and frustration. They engaged with redirection but required reminders to remain grounded. Mild improvement in affect noted toward end of session.  \n\nPlan and Collaboration: Continue emotional regulation support through mindfulness and grounding techniques. Encourage logging disruptions and stressors for legal support. Reinforce follow-up with attorney. Recommend structured daily routine. Monitor for any increase in paranoia or disorganization.  \n\nTherapist Reflection and Insight (optional):   \n\nProgress: Progress  \n\nTherapist Initials: AC`,
          practitionerId: 9,
          patientId: 16,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'f19e007b-fe0e-49bd-b79f-8f911de2e1a3',
          sessionId: 'session-26',
          session: `Session Duration:   \n\nMental Status (optional):   \n\nSuicidality:   \n\nHomicidality:   \n\nSubjective: okay how's everything so I'm supposed to have a legal aid attorney I was hoping they would call me but they said to call if nobody calls in 2 weeks so I have to call tomorrow which is fine it's still early enough and with that yeah I found all kinds of interesting things which is understandable because it's a lot of money when they could have just left me alone to begin with and save all that money so yeah I don't I'm trying to figure out what to do next week so you going to call I really have no other choice yeah I know you like to wake up late but the weather the better yeah yeah more aware I am sort of thing but that's for sure I don't know what else I mean I think you're doing the best that you can with what's been given to you I mean the whole time really really inefficient with myself right that's I can't hear you too well available to the public but because it's worked for me they're going to try and to do with the narrow skin you know they got a baseline for leaving last week which was odd that was weird to put you know instructions which made me realize I have no idea what people's facial expressions are I terrible at it and I didn't know how bad but apparently really really bad so he did the test he did the test which they can't send to me because I don't get mail so I have to wait for him to get it at his office and then go pick it up and how you feel about that okay I couldn't hear you yeah yeah why why are you worrying Mondays so he isn't saying that I said that that's what it's done for me and I feel like that's why trials had some interesting effects I stopped taking it because I was like that's a lot for me to be dealing with right now if you're not going to take it it's always good to let him know your reason why you not going to take it so maybe if there's a suggestion he can give you baby I let him know I just stop I just needed what I told him that I've been taking you to do and I didn't I don't know that neurologist I'm depressed with my suicidal or anything like that what you're not I'm not suicidal I probably depressed but I can't tell what what you mean by you can't tell when you depressed there's a lot of symptoms that comes with it if you're not experiencing those symptoms that means you're not depressed are you struggling to get out of bed are you struggling to get motivated are you lack of motivation are you and there is like a month where I didn't really go anywhere yeah but not going anywhere it's different than want to go anywhere but just don't have the energy to go so that's a quiet distinction between it like you I know your schedule is you don't like to wake up early morning that's your routine so that's not depression you understand somebody that have depression even if the afternoon come they don't want to get up yeah I bet all kinds of excuses but I think it was probably the question and that was probably causing a little bit of depression simulator and I just felt like I was trapped but now I'm pretty sure they've had people follow me at work you know some some of their Asian kid friends but I feel like that's stupid and that's why they're probably the schedule I'm pretty sure there's something wrong with that so that you know just that energy around me is like really put my senses on Friday I good so you can finish your errands?  \n\nObjective:   \n\nAssessment & Therapeutic Intervention:   \n\nReaction to Intervention:   \n\nPlan and Collaboration:   \n\nTherapist Reflection and Insight (optional):   \n\nProgress:   \n\nTherapist Initials: `,
          practitionerId: 9,
          patientId: 16,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '4b2e90f4-23e7-42fa-b106-cd0b9854701d',
          sessionId: 'session-27',
          session: `Session Duration: 3:00 pm - 4:00 pm  \n\nSuicidality: Denied  \n\nHomicidality: Not reported  \n\nSubjective: The client was able to process their anxiety provoking thoughts and explore CBT tools they can turn to.  \n\nObjective: Client was engaged and interactive during the session.  \n\nAssessment & Therapeutic Intervention: Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. The client was able to explore how the increase in their socialization has been helpful for their mood and energy.  \n\nReaction to Intervention: The client was receptive and interactive throughout the duration of the session and responded well to all interventions provided by the therapist.  \n\nPlan and Collaboration: The client to continue to practice CBT tools and to document their thoughts.  \n\nProgress: Progress (Minimal)  \n\nTherapist Initials: Raquel Castello, LMHC, R.V.C`,
          practitionerId: 2,
          patientId: 17,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '4b2e90f4-23e7-42fa-b106-cd0b9854701c',
          sessionId: 'session-28',
          session: `Session Duration: 11:30 am - 12:30 pm  \n\nSuicidality: Denied  \n\nHomicidality: Not reported  \n\nSubjective: The client presented in a neutral manner. The client and writer developed rapport. The client was able to process their feelings of fear and overwhelm.  \n\nObjective: Client was engaged and interactive during the session.  \n\nAssessment & Therapeutic Intervention: Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. Writer and client discussed routines they can utilize to create more structure on a daily basis. The client was able to process their thoughts about upcoming travel and work.  \n\nReaction to Intervention: The client was receptive and interactive throughout the duration of the session and responded well to all interventions provided by the therapist.  \n\nPlan and Collaboration: The client to explore the schedule they can have for themselves that can best assist them currently. The client to engage in healthy routines that were discussed in the session, such as deep breathing, stating gratitude daily and exercise.  \n\nProgress: No Progress  \n\nTherapist Initials: Raquel Castello, LMHC, R.V.C`,
          practitionerId: 2,
          patientId: 17,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '491c2bcf-635d-41f4-a33f-dacf717955ce',
          sessionId: 'session-29',
          session: `Session Duration: 12:00 pm - 1:00 pm  \n\nSuicidality: Denied  \n\nHomicidility: Not reported  \n\nSubjective: Client discussed recent problematic behaviors. Client was able to process their emotions of anger and frustration.  \n\nObjective: Client was engaged and interactive during the session.  \n\nAssessment & Therapeutic Intervention: Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. The client was able to process certain triggers and situations that have occurred within her family.  \n\nReaction to Intervention: The client was receptive and interactive throughout the duration of the session and responded well to all interventions provided by the therapist.  \n\nPlan and Collaboration: The client to work on different writing prompts provided to assist her in self-expression. The client to explore the communication and boundaries she would like to implement with certain family members.  \n\nProgress: Progress (Moderate)  \n\nTherapist Initials: Raquel Castello, LMHC, R.V.C`,
          practitionerId: 2,
          patientId: 18,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: '491c2bcf-635d-41f4-a33f-dacf717955cd',
          sessionId: 'session-30',
          session: `Session Duration: 5:30 pm - 6:30 pm  \n\nSuicidality: Denied  \n\nHomicidality: Not reported  \n\nSubjective: Client discussed improvements within their confidence and socialization with others. Client was able to express their emotions about fears toward being vulnerable with others.  \n\nObjective: Client was engaged and interactive during the session.  \n\nAssessment & Therapeutic Intervention: Writer provided the client with empathic and reflective listening when exploring her past experiences. Client to continue to explore their emotions in a healthy manner through writing and self-expression. Client to create a healthy routine and practice to promote the development of healthy strategies for emotion regulation, distress tolerance and anger management.  \n\nReaction to Intervention: The client was receptive to suggestions, insight and feedback.  \n\nPlan and Collaboration: The client to explore DBT tools provided in session for more practice in self soothing and grounding.  \n\nProgress: Progress  \n\nTherapist Initials: Raquel Castello, LMHC, R.V.C`,
          practitionerId: 2,
          patientId: 18,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'd7be4b6a-cc29-46c6-accf-3107520ef085',
          sessionId: 'session-31',
          session: `Session Duration: 9:00 am - 9:53 am (53 minutes)  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client is looking more into jobs. Client is unsure of what she wants to do and discussed possibilities in session.  \n\nObjective: Client was alert and engaged in therapy.  \n\nAssessment & Therapeutic Intervention: Talk therapy, active listening, coping skills, CBT, career counseling.  \n\nReaction to Intervention: Client was open to intervention and reacted positively.  \n\nPlan and Collaboration: Client will be mindful of topics explored in today's session.  \n\nProgress: Progress  \n\nTherapist Initials: AL`,
          practitionerId: 8,
          patientId: 19,
          type: SessionTypeEnum.intake,
        },
        {
          noteId: 'd7be4b6a-cc29-46c6-accf-3107520ef084',
          sessionId: 'session-32',
          session: `Session Duration: 9:00 am - 9:53 am (53 minutes)  \n\nSuicidality: Not Present  \n\nHomicidality: Not Present  \n\nSubjective: Client notes feeling a bit  \n\nObjective:   \n\nAssessment & Therapeutic Intervention:   \n\nReaction to Intervention:   \n\nPlan and Collaboration:   \n\nProgress:   \n\nTherapist Initials: `,
          practitionerId: 8,
          patientId: 19,
          type: SessionTypeEnum.intake,
        },
      ]

      // Get CPT code 90791 from seeder
      const cptCode = await CptCode.findBy('code', '90791')
      if (!cptCode) {
        throw new Error('CPT code 90791 not found. Please run CPT code seeder first.')
      }

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
            type: sessionData.type,
            cptCodeId: cptCode.id,
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
