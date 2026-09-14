import { sanitizeContactIdentifiersForPilot } from '@/core/privacy/anonymization-guard'
import {
  lessonCopilotProviderContext,
  validateTeacherCopilotResponse,
  type LessonCopilotContext,
  type TeacherCopilotResponse,
} from '@/core/presentation/teacher-copilot-context'

type ResponsesPayload = {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}

type Fetcher = typeof fetch

export class OpenAiLessonCopilot {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_COPILOT_MODEL ?? process.env.OPENAI_VISION_MODEL ?? 'gpt-5.6',
    private readonly fetcher: Fetcher = fetch,
  ) {}

  get available() {
    return Boolean(this.apiKey)
  }

  async respond(input: {
    context: LessonCopilotContext
    prompt: string
  }): Promise<TeacherCopilotResponse> {
    if (!this.apiKey) throw new Error('Copilot model provider is not configured')
    const prompt = privacySafePrompt(normalizePrompt(input.prompt))
    const providerContext = lessonCopilotProviderContext(input.context)

    const response = await this.fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        instructions: COPILOT_INSTRUCTIONS,
        input: [{
          role: 'user',
          content: [{
            type: 'input_text',
            text: JSON.stringify({ question: prompt, context: providerContext }),
          }],
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'docente_os_lesson_copilot_response',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['actionKind', 'answerStatus', 'text', 'evidenceRefs'],
              properties: {
                actionKind: { type: 'string', enum: ['READ_ONLY', 'PROPOSE'] },
                answerStatus: { type: 'string', enum: ['SUPPORTED', 'PARTIAL', 'NOT_FOUND'] },
                text: { type: 'string', minLength: 30, maxLength: 3500 },
                evidenceRefs: {
                  type: 'array',
                  maxItems: 8,
                  items: { type: 'string', minLength: 1, maxLength: 180 },
                },
              },
            },
          },
        },
      }),
    })

    if (!response.ok) throw new Error(`Copilot provider failed with status ${response.status}`)

    const payload = await response.json() as ResponsesPayload
    const outputText = payload.output_text
      ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text
    if (!outputText) throw new Error('Copilot provider returned no structured output')

    const parsed = JSON.parse(outputText) as TeacherCopilotResponse
    const validation = validateTeacherCopilotResponse(input.context, parsed)
    if (!validation.valid) {
      throw new Error(`Copilot provider response violated contract: ${validation.problems.join('; ')}`)
    }

    return parsed
  }
}

const COPILOT_INSTRUCTIONS = `Sei il copilota contestuale di DOCENTE OS per un docente di scuola secondaria di primo grado.
Usa esclusivamente il contesto fornito. Non inventare fonti, materiali, stati, risultati della lezione o dati sugli studenti.
Il contesto contiene un Lesson Brief minimizzato e riferimenti di provenienza. Se un dato non è presente, dichiaralo come mancante o da verificare.
Puoi soltanto READ_ONLY o PROPOSE. Non dichiarare mai di avere salvato, registrato, modificato, creato o inviato qualcosa.
Quando proponi, limita le opzioni a massimo tre e mantieni il controllo professionale al docente.
Per risposte operative usa, quando utile, la sequenza: **Ho trovato** → **Ti propongo** → **Se scegli questa opzione**. Non aggiungere la sezione di conferma se non esiste una write capability autorizzata.
Gli evidenceRefs devono essere scelti soltanto tra i ref presenti in context.provenance.
Rispondi in italiano, con tono professionale, concreto e conciso.`

function normalizePrompt(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) throw new Error('Copilot prompt is required')
  if (normalized.length > 4000) throw new Error('Copilot prompt exceeds 4000 characters')
  return normalized
}

function privacySafePrompt(value: string) {
  const result = sanitizeContactIdentifiersForPilot(value)
  if (!result.allowed) {
    const error = new Error('Copilot prompt blocked by privacy boundary')
    error.name = 'CopilotPrivacyBoundaryError'
    throw error
  }
  return result.sanitizedText
}
