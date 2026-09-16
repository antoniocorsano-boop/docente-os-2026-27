import {
  normalizeSpeechTranscript,
  type SpeechToTextInput,
  type SpeechToTextPort,
  type SpeechToTextResult,
} from '@/core/application/speech/speech-to-text-port'

type Fetcher = typeof fetch

type TranscriptionPayload = {
  text?: string
}

export class OpenAiSpeechToText implements SpeechToTextPort {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'gpt-transcribe',
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = resolveSpeechTimeoutMs(process.env.OPENAI_TRANSCRIPTION_TIMEOUT_MS),
  ) {}

  get available() {
    return Boolean(this.apiKey)
  }

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    if (!this.apiKey) throw new Error('Speech transcription provider is not configured')

    const form = new FormData()
    form.append('file', new File([input.bytes], input.filename, { type: input.mimeType }))
    form.append('model', this.model)
    form.append('language', input.language)
    form.append('response_format', 'json')

    const response = await this.fetcher('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) throw new Error(`Speech provider failed with status ${response.status}`)

    const payload = await response.json() as TranscriptionPayload
    if (typeof payload.text !== 'string') throw new Error('Speech provider returned no transcript')

    return {
      transcript: normalizeSpeechTranscript(payload.text),
      model: this.model,
    }
  }
}

function resolveSpeechTimeoutMs(value: string | undefined) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 30_000
  return Math.min(60_000, Math.max(5_000, Math.round(parsed)))
}
