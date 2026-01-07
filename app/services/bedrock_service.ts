import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { bedrockConfig } from '#config/services'
import { EvaluationPromptKeys } from '#enums/evaluation_prompt_enum'
import { agentModelKeys } from '#enums/agent_enum'

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
    // Use modelId as-is (no conversion)
    const actualModelId = modelId

    // Claude 3 API format requires:
    // - anthropic_version field
    // - max_tokens (not maxTokens)
    // - system message in separate field (not in messages array)
    // - No inferenceConfig wrapper
    // Claude 4.5 models don't support both temperature and top_p together
    const isClaude45 = actualModelId === agentModelKeys.CLAUDE_4_5_HAIKU_V1

    const body: any = {
      anthropic_version: bedrockConfig.anthropicVersion,
      max_tokens: bedrockConfig.maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
        },
      ],
    }

    // For Claude 4.5, only use temperature (not top_p)
    if (isClaude45) {
      body.temperature = temperature
    } else {
      // For other models, use temperature and optionally top_p/top_k
      body.temperature = temperature
      if (typeof topP === 'number') {
        body.top_p = topP
      }
      if (typeof topK === 'number') {
        body.top_k = topK
      }
    }

    const command = new InvokeModelCommand({
      modelId: actualModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    })

    console.log('Invoking Bedrock model:', actualModelId, 'in region:', bedrockConfig.region)
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

// Validation function to check Bedrock response structure
const validateBedrockResponse = (
  parsed: any
): {
  isValid: boolean
  status: 'pass' | 'fail' | 'error'
  message: string
} => {
  // Required main fields
  const requiredMainFields = ['score', 'pass', 'issues', 'summary', 'sentiment', 'evaluation']
  const missingMainFields: string[] = []

  // Check if main fields exist
  requiredMainFields.forEach((field) => {
    if (parsed[field] === undefined || parsed[field] === null) {
      missingMainFields.push(field)
    }
  })

  // If all main fields are missing, return fail
  if (missingMainFields.length === requiredMainFields.length) {
    return {
      isValid: false,
      status: 'fail',
      message: `Missing all required main fields: ${requiredMainFields.join(', ')}`,
    }
  }

  // If some main fields are missing, return error
  if (missingMainFields.length > 0) {
    return {
      isValid: false,
      status: 'error',
      message: `Missing required main fields: ${missingMainFields.join(', ')}`,
    }
  }

  // Check issues array subfields if issues array exists
  if (Array.isArray(parsed.issues)) {
    const requiredIssueFields = ['severity', 'points_deducted', 'section', 'justification']
    const issuesWithMissingFields: number[] = []

    parsed.issues.forEach((issue: any, index: number) => {
      const missingFields: string[] = []
      requiredIssueFields.forEach((field) => {
        if (issue[field] === undefined || issue[field] === null || issue[field] === '') {
          missingFields.push(field)
        }
      })
      if (missingFields.length > 0) {
        issuesWithMissingFields.push(index)
      }
    })

    // If issues array has items but subfields are missing, return error
    if (issuesWithMissingFields.length > 0) {
      return {
        isValid: false,
        status: 'error',
        message: `Issues array items at indices [${issuesWithMissingFields.join(', ')}] are missing required subfields`,
      }
    }
  }

  // All validations passed - structure is valid
  return {
    isValid: true,
    status: 'pass',
    message: 'All required fields are present',
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
  'user_input': string
  'validation_result'?: {
    isValid: boolean
    status: 'pass' | 'fail' | 'error'
    message: string
  }
}> => {
  // Use the provided system prompt from agent
  const evaluationSystemPrompt = systemPrompt

  // Build user prompt with current and previous notes
  // Extract plain text from session data (no JSON stringification - send as plain text)
  let currentNoteText: string

  try {
    // Try to parse if it's JSON, otherwise use as-is
    const parsed = typeof currentNote === 'string' ? JSON.parse(currentNote) : currentNote
    // Extract session text from parsed object or use the string directly
    currentNoteText = parsed.session || parsed || currentNote
  } catch {
    // If parsing fails, use as plain text
    currentNoteText = typeof currentNote === 'string' ? currentNote : String(currentNote)
  }

  // Extract plain text from previous note
  let previousNoteText: string | undefined
  if (previousNote) {
    try {
      const parsed = typeof previousNote === 'string' ? JSON.parse(previousNote) : previousNote
      const sessionText = parsed.session || parsed || previousNote
      previousNoteText = typeof sessionText === 'string' ? sessionText : String(sessionText)
    } catch {
      previousNoteText = typeof previousNote === 'string' ? previousNote : String(previousNote)
    }
  }

  // Build prompt with plain text format (no JSON, no escaped quotes, no \n\n)
  let evaluationUserPrompt = `${EvaluationPromptKeys.currentSession}:
${currentNoteText}

`

  if (previousNoteText) {
    evaluationUserPrompt += `${EvaluationPromptKeys.previousSessions}:
${previousNoteText}`
  } else {
    evaluationUserPrompt += `${EvaluationPromptKeys.previousSessions}:
No previous sessions available for this patient`
  }

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

      // Validate response structure
      const validation = validateBedrockResponse(parsed)

      // Normalise issues and compute numeric score based on deductions
      // Helper function to round points to nearest multiple of 5
      const roundToNearestFive = (num: number): number => {
        return Math.round(num / 5) * 5
      }

      const issues = (parsed.issues || []).map((issue: any) => {
        let severity = issue.severity as string | undefined
        let pointsDeducted = typeof issue.points_deducted === 'number' ? issue.points_deducted : 0

        // Round points_deducted to nearest multiple of 5 (5, 10, 15, 20, 25, etc.)
        pointsDeducted = roundToNearestFive(Math.abs(pointsDeducted))

        // If severity not provided, derive from points_deducted
        if (!severity) {
          if (pointsDeducted >= 25) {
            severity = 'critical'
          } else if (pointsDeducted >= 15) {
            severity = 'moderate'
          } else {
            severity = 'minor'
          }
        }
        return {
          severity: (severity || '') as string,
          points_deducted: pointsDeducted,
          section_id: issue.section_id || '',
          section: issue.section || '',
          justification: issue.justification || '',
        }
      })

      // Start from 100 and subtract the absolute value of each issue's deduction
      // Score can go negative if there are many issues (e.g., -20 for severe problems)
      let score = 100
      if (Array.isArray(issues) && issues.length > 0) {
        const totalDeduction = issues.reduce((sum: number, item: any) => {
          const penalty =
            typeof item.points_deducted === 'number' ? Math.abs(item.points_deducted) : 0
          return sum + penalty
        }, 0)
        score = 100 - totalDeduction
      }

      return {
        'score': score,
        'pass': score >= 75,
        'issues': issues,
        'summary': parsed.summary || '',
        'sentiment':
          parsed.sentiment || (score > 75 ? 'positive' : score >= 50 ? 'neutral' : 'negative'),
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
        'user_input': evaluationUserPrompt,
        'validation_result': validation,
      }
    }

    // Fallback: extract from text
    const scoreMatch = responseText.match(/score[:\s]*(\d+)/i)

    const rawScore = scoreMatch ? Number.parseInt(scoreMatch[1]) : 0
    const clampedScore = Math.max(0, Math.min(100, rawScore))

    // Try to parse as JSON for validation
    let validation: {
      isValid: boolean
      status: 'pass' | 'fail' | 'error'
      message: string
    } = {
      isValid: false,
      status: 'error',
      message: 'No valid JSON structure found in response',
    }
    try {
      const fallbackParsed = JSON.parse(responseText)
      validation = validateBedrockResponse(fallbackParsed)
    } catch {
      // Already set validation to error
    }

    return {
      'score': clampedScore,
      'pass': clampedScore >= 75,
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
      'user_input': evaluationUserPrompt,
      'validation_result': validation,
    }
  } catch (error: any) {
    // For errors, return fallback response with error validation status
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
      'user_input': evaluationUserPrompt,
      'validation_result': {
        isValid: false,
        status: 'error',
        message: error.message || 'Failed to parse Bedrock response',
      },
    }
  }
}
