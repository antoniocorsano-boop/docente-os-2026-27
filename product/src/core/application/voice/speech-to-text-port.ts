export type SpeechToTextInput = {
  audio: Blob
  filename: string
  mimeType: string
  language: 'it'
}

export type SpeechToTextResult = {
  text: string
  provider: string
  model: string
}

export interface SpeechToTextPort {
  readonly available: boolean
  transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult>
}
