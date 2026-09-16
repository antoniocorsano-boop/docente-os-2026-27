export function isVoiceCaptureEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() !== 'off'
}
