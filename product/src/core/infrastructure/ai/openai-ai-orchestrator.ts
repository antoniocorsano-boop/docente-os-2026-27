import {
  AiProviderUnavailableError,
  type AiOrchestratorPort,
  type ClassroomAiContext,
  type ClassroomImageProposal,
  type ClassroomTextProposal,
  type ClassroomTextSupportKind,
} from '@/core/application/ports/ai-orchestrator'

type FetchLike = typeof fetch

type ResponsesPayload = {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}

type ImagePayload = {
  data?: Array<{ b64_json?: string }>
}

export class OpenAiAiOrchestrator implements AiOrchestratorPort {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly textModel = process.env.OPENAI_TEXT_MODEL ?? process.env.OPENAI_VISION_MODEL ?? 'gpt-5.6',
    private readonly imageModel = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2.5-flare',
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async proposeClassroomText(input: {
    kind: ClassroomTextSupportKind
    context: ClassroomAiContext
  }): Promise<ClassroomTextProposal> {
    const apiKey = this.requireApiKey()
    const response = await this.fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model: this.textModel,
        input: [{
          role: 'user',
          content: [{ type: 'input_text', text: classroomTextPrompt(input.kind, input.context) }],
        }],
        max_output_tokens: 260,
      }),
    })

    if (!response.ok) throw providerError('Classroom text generation', response)
    const payload = await response.json() as ResponsesPayload
    const text = payload.output_text
      ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text
    if (!text?.trim()) throw new Error('Classroom text generation returned no text')

    return {
      capability: 'CLASSROOM_TEXT_PROPOSE',
      status: 'PROPOSED',
      text: text.trim().slice(0, 1800),
      provider: 'OpenAI',
      model: this.textModel,
    }
  }

  async proposeClassroomImage(input: { context: ClassroomAiContext }): Promise<ClassroomImageProposal> {
    const apiKey = this.requireApiKey()
    if (!input.context.visualBrief) throw new Error('visualBrief is required')

    const response = await this.fetcher('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model: this.imageModel,
        prompt: classroomImagePrompt(input.context),
        size: '1536x1024',
        quality: 'low',
        output_format: 'jpeg',
        output_compression: 82,
      }),
    })

    if (!response.ok) throw providerError('Classroom image generation', response)
    const payload = await response.json() as ImagePayload
    const base64 = payload.data?.[0]?.b64_json
    if (!base64) throw new Error('Classroom image generation returned no image')

    return {
      capability: 'CLASSROOM_IMAGE_GENERATE',
      status: 'PROPOSED',
      mimeType: 'image/jpeg',
      base64,
      altText: `Visuale didattico proposto per ${input.context.stepTitle}`,
      provider: 'OpenAI',
      model: this.imageModel,
    }
  }

  private requireApiKey() {
    if (!this.apiKey) throw new AiProviderUnavailableError('OPENAI_API_KEY is required for classroom generative support')
    return this.apiKey
  }
}

export function classroomTextPrompt(kind: ClassroomTextSupportKind, context: ClassroomAiContext) {
  const task = kind === 'SIMPLER'
    ? 'Proponi una spiegazione alternativa più semplice.'
    : kind === 'EXAMPLE'
      ? 'Proponi un solo esempio concreto alternativo.'
      : 'Proponi una sola domanda breve di controllo della comprensione.'

  return [
    'Sei un supporto didattico per un docente di Tecnologia della scuola secondaria di primo grado.',
    'Produci una PROPOSTA breve: non cambiare obiettivo, non aggiungere dati sugli alunni e non dichiarare di aver modificato alcun piano o registro.',
    task,
    `Lezione: ${context.lessonTitle}`,
    `Passaggio: ${context.stepTitle}`,
    `Istruzione: ${context.instruction}`,
    context.cue ? `Punto da mettere in evidenza: ${context.cue}` : '',
    context.localHint ? `Supporto locale già disponibile, da non copiare meccanicamente: ${context.localHint}` : '',
    'Rispondi in italiano, in massimo 90 parole, senza preamboli.',
  ].filter(Boolean).join('\n')
}

export function classroomImagePrompt(context: ClassroomAiContext) {
  return [
    'Crea un visuale didattico chiaro per una lezione di Tecnologia nella scuola secondaria di primo grado.',
    `Tema della lezione: ${context.lessonTitle}.`,
    `Passaggio corrente: ${context.stepTitle}.`,
    `Brief visuale verificato dal docente: ${context.visualBrief}.`,
    'Stile: diagramma didattico pulito, leggibile su proiettore, composizione semplice, sfondo chiaro, pochi elementi essenziali.',
    'Evita persone identificabili, fotografie di alunni, loghi, marchi e decorazioni non necessarie.',
    'Se servono parole, usa solo etichette italiane molto brevi e grandi; privilegia frecce, forme e relazioni visive.',
    'Non introdurre concetti ulteriori rispetto al brief.',
  ].join('\n')
}

function headers(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
}

function providerError(label: string, response: Response) {
  const requestId = response.headers.get('x-request-id')
  const suffix = requestId ? ` request=${requestId}` : ''
  return new Error(`${label} failed (${response.status})${suffix}`)
}
