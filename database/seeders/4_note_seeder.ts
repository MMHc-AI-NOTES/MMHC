// import { BaseSeeder } from '@adonisjs/lucid/seeders'
// import Session from '#models/session'
// import CptCode from '#models/cpt_code'
// import WebhookSessionVersion from '#models/webhook_session_version'
// import {
//   SessionTypeEnum,
//   AiStatusEnum,
//   HumanReviewEnum,
//   ManagerEnum,
//   WorkflowEnum,
//   PriorityEnum,
// } from '#enums/session_enum'
// import { ReviewCycleEnum } from '#enums/review_cycle_enum'

// export default class extends BaseSeeder {
//   async run() {
//     try {
//       const sessionsData = [
//         {
//           noteId: '3dce6595-1ea9-485f-9713-cc467384318d',
//           sessionId: 'session-59',
//           session: {
//             'Session Duration': '10am-10:53am',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'Not reported',
//             'Subjective':
//               'The client presented in a anxious manner. Client discussed recent challenges within her relationship. Client was able to express her worries and fears. Client was vocal in the session.',
//             'Objective': 'Client was engaged and interactive during the session.',
//             'Assessment & Therapeutic Intervention':
//               'Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. Client was provided with education on somatic exercises she can practice to improve her self regulation.',
//             'Reaction to Intervention':
//               'The client was receptive and interactive throughout the duration of the session and responded well to all interventions provided by the therapist.',
//             'Plan and Collaboration':
//               'Client to continue to meet for weekly individual session. Client was encouraged to engage in a beginners yoga class.',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress (Moderate progress.)',
//             'Therapist Initials': 'Raquel Castello, LMHC, R.V.C',
//           },
//           practitionerId: 8,
//           patientId: 37,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: '3dce6595-1ea9-485f-9713-cc467384318e',
//           sessionId: 'session-60',
//           session: {
//             'Session Duration': '10am-10:53am',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'Not reported',
//             'Subjective':
//               'The client presented in a calm manner. Client discussed recent progress that she has noticed. Client was able to explore triggers to anxiety.',
//             'Objective': 'Client was engaged and interactive during the session.',
//             'Assessment & Therapeutic Intervention':
//               'Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. Client was able to explore tools that she can utilize for grounding and self regulation. Writer provided education on dbt mindfulness skills.',
//             'Reaction to Intervention':
//               'Client was receptive to education. Client was provided with workbooks she can look into for further education.',
//             'Plan and Collaboration':
//               'Client to continue with weekly individual sessions. The client to engage in mindfulness and grounding skills during the week.',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress (Some progress.)',
//             'Therapist Initials': 'Raquel Castello, LMHC, R.V.C',
//           },
//           practitionerId: 8,
//           patientId: 37,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: 'e4c03ead-daba-4540-aaf3-addea3a3b443',
//           sessionId: 'session-61',
//           session: {
//             'Session Duration': '6:30pm-7:30pm',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'Not reported',
//             'Subjective':
//               'The client presented in a anxious manner. The client reports how they have been feeling more sadness and anxiety. The client was able to process their thoughts related to their emotions as well as identify triggers.',
//             'Objective': 'Client was engaged and interactive during the session.',
//             'Assessment & Therapeutic Intervention':
//               'Client was provided with emotional support. Client was able to explore certain triggers related to interpersonal relationships. Client was able to explore how he can turn to spiritual and religious beliefs to assist him. Self regulation skills were reviewed.',
//             'Reaction to Intervention':
//               'The client was receptive to suggestions, insight and feedback.',
//             'Plan and Collaboration':
//               'Client will work on skills discussed in the session. Client to practice grounding tools as needed and to look to creating certain routines for daily practice.',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress (Minimal progress.)',
//             'Therapist Initials': 'Raquel Castello, LMHC, R.V.C',
//           },
//           practitionerId: 8,
//           patientId: 34,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: 'e4c03ead-daba-4540-aaf3-addea3a3b444',
//           sessionId: 'session-62',
//           session: {
//             'Session Duration': '6:30pm-7:30pm',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'Not reported',
//             'Subjective':
//               'The client presented in a neutral manner. Client discussed recent thoughts and emotions (doubts and guilt) related to his relationship with his partner and goals for the future.',
//             'Objective': 'Client was engaged and interactive during the session.',
//             'Assessment & Therapeutic Intervention':
//               'Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. Client was provided with education on attachment style and family dynamics/roles in families.',
//             'Reaction to Intervention':
//               'The client was receptive and interactive throughout the duration of the session and responded well to all interventions provided by the therapist.',
//             'Plan and Collaboration':
//               'Client to continue to explore his emotions in a healthy manner through writing and self expression. Client to create a healthy routine and practice to promote the development of healthy strategies for emotion regulation, distress tolerance and anger management.',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress (Moderate.)',
//             'Therapist Initials': 'Raquel Castello, LMHC, R.V.C',
//           },
//           practitionerId: 8,
//           patientId: 34,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: 'b6e04e8f-0afc-4e32-897a-d07449783f78',
//           sessionId: 'session-63',
//           session: {
//             'Session Duration': '1000-1053am 53 min',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Not Present',
//             'Homicidality': 'Not Present',
//             'Subjective':
//               'Client notes to be doing alright. Job has been going well. Client has been getting to know employees and bosses more and explored how they feel about coworkers',
//             'Objective':
//               'Client was alert and engaged. Speech was clear, coherent, and goal-directed. Client responded appropriately to questions and prompts.',
//             'Assessment & Therapeutic Intervention':
//               'talk therapy active listening Provided supportive counseling. Used open-ended questioning to promote reflection.',
//             'Reaction to Intervention':
//               'Client was open to intervention and reacted positively. Client demonstrated understanding of concepts discussed. Client appeared attentive during interventions.',
//             'Plan and Collaboration':
//               "Client will be mindful of topics explored in today's session. Continue current therapeutic approach.",
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress',
//             'Therapist Initials': 'Sheila Mashack, LMHC',
//           },
//           practitionerId: 8,
//           patientId: 35,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: 'b6e04e8f-0afc-4e32-897a-d07449783f79',
//           sessionId: 'session-64',
//           session: {
//             'Session Duration': '1000-1053am',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Not Present',
//             'Homicidality': 'Not Present',
//             'Subjective':
//               'Continued conversation from last session and explored how client has been acclimating to new job. Notes continued relief with not being in a leadership position.',
//             'Objective': 'Client was alert and engaged.',
//             'Assessment & Therapeutic Intervention':
//               'talk therapy active listening history gathering reflection',
//             'Reaction to Intervention':
//               'Client was open to intervention and reacted positively. Client was receptive to interventions Client engaged actively in discussion Client demonstrated understanding of concepts discussed',
//             'Plan and Collaboration':
//               "Client will be mindful of topics explored in today's session. Continue individual therapy at current frequency Monitor symptoms and progress toward goals",
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress',
//             'Therapist Initials': 'Sheila Mashack, LMHC',
//           },
//           practitionerId: 8,
//           patientId: 35,
//           type: SessionTypeEnum.progress_note,
//         },

//         {
//           noteId: '02f3230e-6526-46cc-b06b-57f81da105c2',
//           sessionId: 'session-65',
//           session: {
//             'Session Duration': '9-9:53pm',
//             'Encounter Type & Method': 'Video Telehealth',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'None',
//             'Subjective':
//               'Client shared ongoing stress related to unemployment and described feelings of inadequacy about not having secure income. She expressed a desire to return to the workforce, stating that he wants to “get into something” and believes he would qualify because she has no criminal record and has already paid past debts. Client noted increasing motivation to take steps toward employment and expressed willingness to visit workforce assistance locations, create a résumé, and begin applying for seasonal and full-time positions. He verbalized discouragement about finances during the holidays but also a renewed sense of determination to change her situation.',
//             'Objective':
//               'Client presented as alert, oriented, and engaged. Affect anxious but motivated. Speech coherent; thought content focused on employment barriers and next steps. No safety concerns observed.',
//             'Assessment & Therapeutic Intervention':
//               'Motivational interviewing to reinforce client’s readiness for action and highlight her internal strengths.\nBehavioral activation by helping her identify concrete, time-specific steps for job searching and résumé development.\nProblem-solving intervention to break down tasks into manageable actions (e.g., visiting employment centers early, creating one résumé to send out widely).\nCognitive reframing to shift self-talk from “I’m not good enough” to “I have skills, no criminal record, and I qualify for many positions.”\nFuture planning to help her organize her priorities and reduce overwhelm.',
//             'Reaction to Intervention':
//               'Client appeared receptive, encouraged, and increasingly confident as the session progressed. She responded positively to the step-by-step plan and verbalized that she feels more capable of moving forward. She agreed that job searching will be her priority tomorrow and stated she is committed to following the plan.',
//             'Plan and Collaboration':
//               'Client will go to the employment center tomorrow morning when they open to start résumé creation and job-matching services.\nBegin sending résumés to multiple seasonal and retail positions to quickly generate income.\nContinue identifying full-time opportunities that match her skills and strengths.\nMaintain job-searching as a structured daily routine.\nFollow up in the next session to assess progress, address barriers, and adjust the employment plan if needed.',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress',
//             'Therapist Initials': 'Chantal Amoussou, LMHC-D',
//             'Date Completed': '12/15/2025',
//             'Documented by Supervised Clinician (if applicable)': '',
//           },
//           practitionerId: 8,
//           patientId: 36,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: '02f3230e-6526-46cc-b06b-57f81da105c3',
//           sessionId: 'session-66',
//           session: {
//             'Session Duration': '900 - 953  53 minutes',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'None',
//             'Subjective':
//               "where you going today I don't know why didn't you feel like it why didn't you feel like anymore I don't know every year on my birthday I always get like the birthday balloons I don't know why it's supposed to rain today like when I was picking the forecast throughout the week even up to yesterday it said rain for today if I'm like I don't feel like doing anything and it's just supposed to rain anyways or might as well just say forget it and then you know I'll probably just do something with Chad either tomorrow or next week but now the weather looks all good but it's fine I'm content with my decision normally it's like can you hear me yeah I'm here yeah normally for the birthdays I'm like more full on like depressed I don't feel that way this year I just don't feel like I don't know I just wasn't I just didn't know what to do everything that I thought about I ended up like one minute I'm like okay I'm going to do this in the next minute I don't want to do it anymore  that has sound too good sounds like there's some nice emotion there the mood fluctuation there and some linger depression in there I mean I don't know I mean what you you are describing this sense of emotional flatness or indecision around your birthday is more common than people realize right you are not alone emotional way than we often expect and damn Milestone right reminders of time passing expectations memories like the good or the painful and even on fulfilled hopes right you are not in a deep depression this year that's what you say which shows growth right but but here comes the boat and we can feel uncertain a little bit and there is an underlining disappointment or emotional program here in here especially since you mention the weather shifted and you still didn't want to change your plan yeah and this sounds like a form of emotional ambivalence wanting connection or celebration but not feeling the energy of clarity to follow through some reflective questions to explore gently here what was you hoping this birthday will feel like oh you can't even ask yourself that question instead of me asking you what was I hoping this birthday will feel like reflect on that was there an unspoken wish that that way I met and what do birthdays represent to you is he representing Joy is a representing pressure is it representing loneliness is a representing Milestone whatsoever ask yourself that question because often is not just about the day it's about what a mirrors back to us emotionally so I want you to do those reflective question we can either do it today if you have time you can join all about it or do some voice notes about it it's up to you whatever way you want to process that yeah I mean we can talk about it okay let's see the question I guess what came to my mind is that I never I guess I never like I guess I didn't have any expectations for my birthday this year throughout the wedding season and I guess a part of me just doesn't like to feel like a burden so it's like you know I have to come up with plans bring my friends together you know I don't know me I'm just like you know and I don't know why that is I mean it could be I know before like before when I was living at home and I wasn't driving and I didn't have my stuff together I definitely felt stagnant and just like kind of like a loser but now you know I'm reflecting and I'm really happy with how far I've come in a short time because you know I just moved out two years ago I just got a car two years ago so I had a lot of cheating really fast you know Chad and I moved in with my first time moving out all happened in 2023 so everything kind of happened fast I was stagnant for a while and then you know I got my masters and the year later I moved out or two years ago a few years later yeah I moved out then a year after that two years later now I'm married you know so I'm happy with where I am not where I want to be you know I'm not where I want to be but I'm happy with where I am I guess you know I lost a little bit of weight normally I feel around my birthday but I feel fat and ugly this year not that I'm not my body is not where I want it but it's not where it was so it's like I don't know why I feel like this you know like when I have so much to be grateful for but it could just be the feeling of not wanting attention I guess I don't know maybe there's something else that I'm just unaware of that's what I'm getting are you still the answer or the reflective question yet was that an unspoken wish that went and met I wanted to lose weight excuse me so I can't really think of anything I don't think there's any unspoken with and what do birthdays represent to you you breaking up yes whatever hello hello yeah can you hear me no yes I just heard I guess and I said anything else and then reflecting on that year and then looking forward that's a lie yeah yeah I said lie you just unpacked and die alone is powerful being so reflective and honest I think what you from what you share there is a deeper emotional layering happening around this birthday it's not sadness exactly and it's not depression like before that's for sure but it's something it's the way you talking through it tells me you are deeply self aware even as you still trying to name it and then you name so much group they're moving out getting the car finishing your Masters getting married losing weight but even when we are progressing Nico emotionally ambivalence can sneak in and what does that mean yeah because you despise all this thing like yeah I got what I want but I'm still feeling a little unsettle I hope I did a good job by explaining that let me know yeah you know like like that in between feeling of being proud but still a little unsettle that's what is emotional ambivalence I don't want attention I don't want to feel like a burden there is so much to be grateful for so why do I feel this way those three sentences you make this sounds like a conflict between deserving celebration and fearing you are too much for asking for it yeah and and and that inner voice that says I should need anything extra and that's often shipped bypass experiences Paris season of not being celebrated or feeling like asking me being disappointed birthdays are usually emotional mirrors not just calendars they reflect Where We Are where we've been and where we thought we will be so even if you didn't have big expectation this year they may have still been a quiet hope for something meaningful something that didn't ask you to do all the planning and that wish even if not fully name might have gone on met are you hearing me is that ringing a belly well here is what you did answer me Nicole when I ask what was I hoping this birthday will feel like you say I guess not like a burden I didn't want to have to put it all together remember that those answers yes I do no when I what did you say your answer was I wanted to lose more weight maybe I wanted to feel a little more celebrated without needing to ask you remember those answer and then when I ask what do birthday represent to you you said a reflection a chance to look back and look ahead are those giving you clarity now can you see the clarity of that now yeah okay so you already have your own spoken wish and they met need bye just answering those questions you already studied the problem I guess I don't want to feel like a burden how did you want to have to put it all together they still lingering me that I'm not quiet today yet I wanted to lose more weight I lost it but I'm not there where I want to be I want to feel more celebrated without needing to ask why can't somebody just throw a surprise something for me why I had to coordinate everything I think you misunderstood that part I just mean like I just don't feel like planning not necessarily that I want someone to plan for me I don't know if that makes sense yeah and you open your door and you see all your friends standing there to wish you happy but would you decline it no exactly that's what I'm talking about instead of why do I feel like this when I have so much to be grateful for like you state it is there a way you can reframe that it's normal to feel like this I don't know that's part of a you normalize your feelings so that's good but is there any other way to reframe why do I feel this when I have so much to be grateful for even though I have so much to be grateful for it's okay to still want other things sorry almost there right I am allowed to feel both grateful and emotionally quiet I am proud of how far I've come and it's okay if I still care require disappointment yeah gratitude and heaviness can cause its Nicole you don't need to face want to prove the other okay you also mention not wanting to be a burden and I keep going to that especially around celebrations and that often comes from a history where you may feel like your needs made others uncomfortable or you were expected to minimize or to be low maintenance is that happen before in the past I guess I remember when I was my dad is like sort of like I don't know what the word to describe him he's lived a tough life and I guess he just I don't know but I remember when I was young like I have my cousin his brother's daughter she is always kind of like boiled in a sense when she was young and her dad kind of had room to like you know spend money and you know put her in good schools or whatever and I guess my dad didn't have that same opportunity even though their brothers says my dad is the oldest you know he's the oldest so he's sacrifice going to college and whatever but anyways I just vividly remember my uncle used to call my cousin like oh that's a princess or whatever and I remember my dad I don't remember what it was I remember my dad's telling me like you are not a princess like you got to stop like whatever basically trying to distilling me like to wake up and see life for what it is I guess wow that's such a harsh thing to say to a little girl you into life you know see life for what it really is talk with us and then it comes back to play with us right like I can tell you it took me yes for me to come up come up like Africa in Africa we were brought up like when you talk when you speak into somebody older than you you cannot be looking better in the eyes that's disrespect so and that was grueling me and when I came to America when I see somebody older than me talking to even professionally I will always even up to you now it happened sometimes you know because it's so deeply rudying me to the point that but America see it as you been honest but that's not what they they background that I came from said you understand like when grown up talking you can just talk back and express how you feel and that's dispel rude and everything so therefore when I came in here especially when I was with my husband and when he's talking I will be bothering all this emotion and I can't talk back because I'll be like oh they will see you took a long time for me to unlock those things so it's almost the similarities over here instead of him he's I'm not saying he he's a mean person or he did a purposely but I think it's from his upbringing you know let me give it to her this way so she can realize it but sometimes it's all it takes is no matter what is to empowering the job right so that's what I'm saying so then sentence that you may be happening to you today you will be you may be seeing and that is nothing but when we keep on talking and keep on digging you will see it's connected to something that happened to you in the past I'm off the reason to birthdays may not be such a big deal connect to many many other things and this map also be that you are experiencing a kind of quiet grip for teens you still want even while living in progress and that's not regression that's real refreshing though yeah yeah yes such a powerful and telling peace of your story that you just said to me where your dad said you're not a princess you need to see life for what it is may have been this way he's way of trying to prepare you for her she but again for a child would like that don't land as protection they learn as denial of worth of tenderness of being cherish just for existing and it makes perfect sense why now even years later you are grabbing with a sense that wanting more especially around your celebration feels like asking for too much that inner voice that says I shouldn't feel this way I should be grateful maybe your father's voice internalize and it was probably his way of surviving his own and meet but you are now allowed to rewrite that narrative noun Nicole you can you can write you can't rewrite that narrative so let's move let's rework that sentence why do I feel this when I have so much to be grateful for into something more emotionally accurate and self-compassion maybe go ahead to it I didn't hear you right I was thought to minimize joy and need for now I'm learning I'm allowed to one soft moment too I deserve soft moment too feeling quiet on showing my birthday doesn't mean something is wrong it just means something inside me still deserve gentleness gratitude doesn't cancel longing I can know both at once yeah part of me I still healing and that doesn't mean I'm ungrateful I mean some human so that's how you started writing your narrative you breaking up Nicole right that's why it's very important that you keep opening up so we can connect something that's happening to you now to the past so you can walk on there so you can't you stop the train and you don't carry it to your child right I know that way why you might be feeling this way you are likely experiencing what we call in therapy and biggest grief not for something lost but some for something never fully given again I'm going to go back to that sentence your dad say you not a princess there was more than a phrase it was more than a phrase",
//             'Objective': '',
//             'Assessment & Therapeutic Intervention': '',
//             'Reaction to Intervention': '',
//             'Plan and Collaboration': '',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': '',
//             'Therapist Initials': 'Chantal Amoussou, LMHC',
//           },
//           practitionerId: 8,
//           patientId: 36,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: '3828ccd0-2424-4ea4-bdfb-abb4da59b404',
//           sessionId: 'session-67',
//           session: {
//             'Session Duration': '10am-10:53am',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'Not reported',
//             'Subjective':
//               'The client presented in a calm manner. Client discussed recent progress that she has noticed. Client was able to explore triggers to anxiety.',
//             'Objective': 'Client was engaged and interactive during the session.',
//             'Assessment & Therapeutic Intervention':
//               'Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. Client was able to explore tools that she can utilize for grounding and self regulation. Writer provided education on dbt mindfulness skills.',
//             'Reaction to Intervention':
//               'Client was receptive to education. Client was provided with workbooks she can look into for further education.',
//             'Plan and Collaboration':
//               'Client to continue with weekly individual sessions. The client to engage in mindfulness and grounding skills during the week.',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress (Some progress.)',
//             'Therapist Initials': 'Raquel Castello, LMHC, R.V.C',
//           },
//           practitionerId: 8,
//           patientId: 37,
//           type: SessionTypeEnum.progress_note,
//         },
//         {
//           noteId: '3828ccd0-2424-4ea4-bdfb-abb4da59b405',
//           sessionId: 'session-68',
//           session: {
//             'Session Duration': '10am-10:53am',
//             'Mental Status (optional)': '',
//             'Suicidality': 'Denied',
//             'Homicidality': 'Not reported',
//             'Subjective':
//               'The client presented in a anxious manner. Client discussed recent challenges within her relationship. Client was able to express her worries and fears. Client was vocal in the session.',
//             'Objective': 'Client was engaged and interactive during the session.',
//             'Assessment & Therapeutic Intervention':
//               'Therapist intervened with a person centered approach, engaging in skills such as active listening, empathic responding, and unconditional positive regard. Client was provided with education on somatic exercises she can practice to improve her self regulation.',
//             'Reaction to Intervention':
//               'The client was receptive and interactive throughout the duration of the session and responded well to all interventions provided by the therapist.',
//             'Plan and Collaboration':
//               'Client to continue to meet for weekly individual session. Client was encouraged to engage in a beginners yoga class.',
//             'Therapist Reflection and Insight (optional)': '',
//             'Progress': 'Progress (Moderate progress.)',
//             'Therapist Initials': 'Raquel Castello, LMHC, R.V.C',
//           },
//           practitionerId: 8,
//           patientId: 37,
//           type: SessionTypeEnum.progress_note,
//         },
//       ]

//       // Get CPT code 90791 from seeder
//       const cptCode = await CptCode.findBy('code', '90791')
//       if (!cptCode) {
//         throw new Error('CPT code 90791 not found. Please run CPT code seeder first.')
//       }

//       const createdSessions = await Session.fetchOrCreateMany(
//         ['noteId', 'sessionId'],
//         sessionsData.map((sessionData) => {
//           // Convert session object to JSON string if it's an object, otherwise use as string
//           let sessionString: string
//           if (typeof sessionData.session === 'object' && sessionData.session !== null) {
//             // Convert object to JSON string
//             sessionString = JSON.stringify(sessionData.session)
//           } else {
//             sessionString = sessionData.session as string
//           }

//           return {
//             noteId: sessionData.noteId,
//             sessionId: sessionData.sessionId,
//             session: sessionString,
//             practitionerId: sessionData.practitionerId,
//             patientId: sessionData.patientId,
//             type: sessionData.type,
//             cptCodeId: cptCode.id,
//             aiScore: null,
//             aiStatus: AiStatusEnum.not_reviewed,
//             humanReview: HumanReviewEnum.pending,
//             manager: ManagerEnum.pending,
//             workflow: WorkflowEnum.in_queue,
//             priority: PriorityEnum.low,
//             reviewCycle: ReviewCycleEnum.cycle_1_of_3,
//           }
//         })
//       )

//       // Create versions for each session
//       for (const session of createdSessions) {
//         // Check if version already exists for this note
//         const existingVersion = await WebhookSessionVersion.query()
//           .where('note_id', session.noteId)
//           .first()

//         // Only create version if it doesn't exist
//         if (!existingVersion) {
//           await WebhookSessionVersion.create({
//             noteId: session.noteId,
//             sessionJson: session.session,
//           })
//         }
//       }
//     } catch (error) {
//       console.log(`Error in seeding sessions: ${error}`)
//       throw error
//     }
//   }
// }
