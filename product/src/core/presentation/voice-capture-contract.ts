export const VOICE_CAPTURE_MAX_DURATION_MS = 90_000
export const VOICE_CAPTURE_MAX_BYTES = 8 * 1024 * 1024

export const VOICE_CAPTURE_ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
] as const

export type VoiceCaptureMimeType = (typeof VOICE_CAPTURE_ALLOWED_MIME_TYPES)[number]

export function normalizeVoiceMimeType(value: string) {
  return value.split(';', 1)[0].trim().toLowerCase()
}

export function isAllowedVoiceMimeType(value: string): value is VoiceCaptureMimeType {
  return VOICE_CAPTURE_ALLOWED_MIME_TYPES.includes(normalizeVoiceMimeType(value) as VoiceCaptureMimeType)
}
