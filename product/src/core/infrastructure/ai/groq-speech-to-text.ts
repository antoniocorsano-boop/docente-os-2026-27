import type {
  SpeechToTextInput,
  SpeechToTextPort,
  SpeechToTextResult,
} from '@/core/application/voice/speech-to-text-port'

type TranscriptionPayload = {
  text?: string
}

type Fetcher = typeof fetch

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

export class GroqSpeechToText implements SpeechToTextPort {
  constructor(
    private readonly apiKey = process.env.GROQ_STT_API_KEY,
    private readonly model = process.env.GROQ_TRANSCRIPTION_MODEL ?? 'whisper-large-v3-turbo',
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = resolveTimeoutMs(process.env.GROQ_STT_TIMEOUT_MS),
  ) {}

  get available() {
    return Boolean(this.apiKey)
  }

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    if (!this.apiKey) throw new Error('Speech-to-text provider is not configured')

    const form = new FormData()
    form.append('file', input.audio, input.filename)
    form.append('model', this.model)
    form.append('language', input.language)

    const response = await this.fetcher(GROQ_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) throw new Error(`Speech-to-text provider failed with status ${response.status}`)

    const payload = await response.json() as TranscriptionPayload
    const text = normalizeTranscript(payload.text)
    if (!text) throw new Error('Speech-to-text provider returned no transcript')

    return {
      text,
      provider: 'GROQ',
      model: this.model,
    }
  }
}

function normalizeTranscript(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, 4000)
}

function resolveTimeoutMs(value: string | undefined) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 20_000
  return Math.min(45_000, Math.max(3_000, Math.round(parsed)))
}
