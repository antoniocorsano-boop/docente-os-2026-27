export const SPEECH_TO_TEXT_MAX_BYTES = 8 * 1024 * 1024
export const SPEECH_TO_TEXT_MAX_TRANSCRIPT_CHARS = 4000

export const SPEECH_TO_TEXT_ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
])

export type SpeechToTextInput = {
  bytes: Uint8Array
  mimeType: string
  filename: string
  language: 'it'
}

export type SpeechToTextResult = {
  transcript: string
  model: string
}

export interface SpeechToTextPort {
  readonly available: boolean
  transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult>
}

export function normalizeSpeechTranscript(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) throw new Error('Speech provider returned an empty transcript')
  if (normalized.length > SPEECH_TO_TEXT_MAX_TRANSCRIPT_CHARS) {
    throw new Error('Speech transcript exceeds the supported lesson-note length')
  }
  return normalized
}
