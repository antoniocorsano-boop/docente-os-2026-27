export type TimetableSourceMode = '' | 'LOCAL_MINIMIZED_SHARE'

export function isValidIsoCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  )
}

export function resolveTimetableSourceIdentity(input: {
  sourceMode: string
  derivativeFingerprint: string
  originalSourceFingerprint: string
  originalSourceName: string
  derivativeName: string
}) {
  const derivativeFingerprint = validateFingerprint(input.derivativeFingerprint)
  if (input.sourceMode !== 'LOCAL_MINIMIZED_SHARE') {
    return {
      sourceFingerprint: derivativeFingerprint,
      sourceLabel: input.derivativeName || 'Orario importato',
      sourceRef: `sha256:${derivativeFingerprint}`,
    }
  }

  const localOriginalFingerprint = validateFingerprint(input.originalSourceFingerprint)
  const sourceLabel = validateOriginalSourceName(input.originalSourceName)

  return {
    // The authoritative candidate identity is derived from bytes received and hashed on the server.
    sourceFingerprint: derivativeFingerprint,
    sourceLabel,
    // The local original hash is provenance-only and never drives lookup, replacement or deletion.
    sourceRef: `local-original-sha256:${localOriginalFingerprint}; derivative-sha256:${derivativeFingerprint}`,
  }
}

function validateFingerprint(value: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid source fingerprint')
  return value
}

function validateOriginalSourceName(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized.length > 240) throw new Error('Invalid original source name')
  return normalized
}
