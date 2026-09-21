export function isVoiceCaptureEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() !== 'off'
}


export function isVoiceCaptureReady(value: string | undefined, providerKey: string | undefined) {
  return isVoiceCaptureEnabled(value) && Boolean(providerKey?.trim())
}
