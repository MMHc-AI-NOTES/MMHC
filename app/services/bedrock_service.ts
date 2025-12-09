import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { bedrockConfig } from '#config/services'

const client = new BedrockRuntimeClient({
  region: bedrockConfig.region,
  credentials: {
    accessKeyId: bedrockConfig.accessKeyId,
    secretAccessKey: bedrockConfig.secretAccessKey,
  },
})

export interface BedrockEvaluationResponse {
  score?: number
  pass?: boolean
  issues?: Array<{
    severity: string
    points_deducted: number
    section_id?: string
    section: string
    justification: string
  }>
  summary?: string
  sentiment?: string
  evaluation?: string
  output_text?: string
  content?: Array<{ type: string; text: string }>
}

export const invokeBedrockModel = async (
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7,
  topP?: number | null,
  topK?: number | null
): Promise<BedrockEvaluationResponse> => {
  try {
    // Claude 3 API format requires:
    // - anthropic_version field
    // - max_tokens (not maxTokens)
    // - system message in separate field (not in messages array)
    // - No inferenceConfig wrapper
    const body: any = {
      anthropic_version: bedrockConfig.anthropicVersion,
      max_tokens: bedrockConfig.maxTokens,
      temperature: temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
        },
      ],
    }

    if (typeof topP === 'number') {
      body.top_p = topP
    }

    if (typeof topK === 'number') {
      body.top_k = topK
    }

    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    })

    const res = await client.send(command)
    const output = JSON.parse(new TextDecoder().decode(res.body))

    // Claude 3 models return content array with text blocks
    if (output.content && Array.isArray(output.content)) {
      const textContent = output.content
        .map((item: any) => (typeof item === 'string' ? item : item.text || ''))
        .join('')
      return {
        output_text: textContent,
        content: output.content,
      }
    }

    return {
      output_text: output.text || JSON.stringify(output),
      ...output,
    }
  } catch (error: any) {
    console.log('Bedrock API Error:', error.message)
    throw new Error('Failed to communicate with AI service. Please try again later.')
  }
}

export const evaluateChatWithBedrock = async (
  modelId: string,
  currentNote: string,
  previousNote: string | undefined,
  systemPrompt: string,
  temperature: number,
  topP?: number | null,
  topK?: number | null
): Promise<{
  'score': number
  'pass': boolean
  'issues': Array<{
    severity: string
    points_deducted: number
    section_id?: string
    section: string
    justification: string
  }>
  'summary': string
  'sentiment': string
  'evaluation': string
  '6tx9-1_subjective'?: string
  'rb2f-1_objective'?: string
  'zad8-1_asment_&_therapeutic_intervention'?: string
  'ugq6-1_reaction_to_intervention'?: string
  'hnfi-1_plan_and_collaboration'?: string
  '9z5t-1_therapist_reflection'?: string
  'gm4p-1_progress'?: string
  'kxgx-7_&_kxgx-8_suicidality/homicidality'?: string
  'raw_response': string
}> => {
  // Use the provided system prompt from agent
  const evaluationSystemPrompt = systemPrompt

  // Build user prompt with current and previous note
  // currentNote and previousNote are JSON strings, so we parse and stringify them properly
  let currentNoteParsed: any
  let previousNoteParsed: any

  try {
    currentNoteParsed = typeof currentNote === 'string' ? JSON.parse(currentNote) : currentNote
  } catch {
    currentNoteParsed = { session: currentNote }
  }

  try {
    previousNoteParsed =
      previousNote && typeof previousNote === 'string' ? JSON.parse(previousNote) : previousNote
  } catch {
    previousNoteParsed = previousNote ? { session: previousNote } : null
  }

  const evaluationUserPrompt = `CURRENT_NOTE:
${JSON.stringify(currentNoteParsed, null, 2)}

PREVIOUS_NOTE:
${previousNoteParsed ? JSON.stringify(previousNoteParsed, null, 2) : 'No previous note available'}`

  // Use detailed evaluation prompt as system prompt
  // Increased max_tokens to handle longer, more detailed responses
  // Use temperature from agent
  const response = await invokeBedrockModel(
    modelId,
    evaluationSystemPrompt,
    evaluationUserPrompt,
    temperature,
    topP ?? undefined,
    topK ?? undefined
  )

  try {
    const responseText = response.output_text || ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      // Map issues format: convert points_deducted to severity if needed, ensure section_id and section are present
      const issues = (parsed.issues || []).map((issue: any) => {
        // Determine severity based on points_deducted if not provided
        let severity = issue.severity
        if (!severity) {
          if (issue.points_deducted >= 25) severity = 'Critical'
          else if (issue.points_deducted >= 15) severity = 'Moderate'
          else severity = 'Minor'
        }
        return {
          severity: severity,
          points_deducted: issue.points_deducted || 0,
          section_id: issue.section_id || '',
          section: issue.section || '',
          justification: issue.justification || '',
        }
      })

      // Ensure score is between 0 and 100
      const rawScore = parsed.score || 0
      const clampedScore = Math.max(0, Math.min(100, rawScore))

      return {
        'score': clampedScore,
        'pass': parsed.pass ?? clampedScore > 75,
        'issues': issues,
        'summary': parsed.summary || '',
        'sentiment':
          parsed.sentiment ||
          (parsed.pass ? 'positive' : clampedScore >= 50 ? 'neutral' : 'negative'),
        'evaluation': parsed.evaluation || parsed.summary || responseText,
        '6tx9-1_subjective': parsed['6tx9-1_subjective'] || '',
        'rb2f-1_objective': parsed['rb2f-1_objective'] || '',
        'zad8-1_asment_&_therapeutic_intervention':
          parsed['zad8-1_asment_&_therapeutic_intervention'] || '',
        'ugq6-1_reaction_to_intervention': parsed['ugq6-1_reaction_to_intervention'] || '',
        'hnfi-1_plan_and_collaboration': parsed['hnfi-1_plan_and_collaboration'] || '',
        '9z5t-1_therapist_reflection': parsed['9z5t-1_therapist_reflection'] || '',
        'gm4p-1_progress': parsed['gm4p-1_progress'] || '',
        'kxgx-7_&_kxgx-8_suicidality/homicidality':
          parsed['kxgx-7_&_kxgx-8_suicidality/homicidality'] || '',
        'raw_response': responseText,
      }
    }

    // Fallback: extract from text
    const scoreMatch = responseText.match(/score[:\s]*(\d+)/i)
    const passMatch = responseText.match(/pass[:\s]*(true|false)/i)

    const rawScore = scoreMatch ? Number.parseInt(scoreMatch[1]) : 0
    const clampedScore = Math.max(0, Math.min(100, rawScore))

    return {
      'score': clampedScore,
      'pass': passMatch ? passMatch[1].toLowerCase() === 'true' : false,
      'issues': [],
      'summary': responseText,
      'sentiment': 'neutral',
      'evaluation': responseText,
      '6tx9-1_subjective': '',
      'rb2f-1_objective': '',
      'zad8-1_asment_&_therapeutic_intervention': '',
      'ugq6-1_reaction_to_intervention': '',
      'hnfi-1_plan_and_collaboration': '',
      '9z5t-1_therapist_reflection': '',
      'gm4p-1_progress': '',
      'kxgx-7_&_kxgx-8_suicidality/homicidality': '',
      'raw_response': responseText,
    }
  } catch (error) {
    return {
      'score': 0,
      'pass': false,
      'issues': [],
      'summary': response.output_text || 'Evaluation completed',
      'sentiment': 'neutral',
      'evaluation': response.output_text || 'Evaluation completed',
      '6tx9-1_subjective': '',
      'rb2f-1_objective': '',
      'zad8-1_asment_&_therapeutic_intervention': '',
      'ugq6-1_reaction_to_intervention': '',
      'hnfi-1_plan_and_collaboration': '',
      '9z5t-1_therapist_reflection': '',
      'gm4p-1_progress': '',
      'kxgx-7_&_kxgx-8_suicidality/homicidality': '',
      'raw_response': response.output_text || 'Evaluation completed',
    }
  }
}
