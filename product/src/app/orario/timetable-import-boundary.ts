export type TimetableSourceMode = '' | 'LOCAL_MINIMIZED_SHARE' | 'LOCAL_MINIMIZED_UPLOAD' | 'LOCAL_RASTER_PAGE_SHARE' | 'LOCAL_RASTER_PAGE_UPLOAD'

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
  derivativeName: string
}) {
  const derivativeFingerprint = validateFingerprint(input.derivativeFingerprint)
  if (!['LOCAL_MINIMIZED_SHARE', 'LOCAL_MINIMIZED_UPLOAD', 'LOCAL_RASTER_PAGE_SHARE', 'LOCAL_RASTER_PAGE_UPLOAD'].includes(input.sourceMode)) {
    return {
      sourceFingerprint: derivativeFingerprint,
      sourceLabel: 'Orario importato',
      sourceRef: `sha256:${derivativeFingerprint}`,
    }
  }

  const wholeDocumentFingerprint = validateFingerprint(input.originalSourceFingerprint)

  return {
    // Persist only the locally computed whole-document fingerprint; the source never crosses the trust boundary.
    sourceFingerprint: wholeDocumentFingerprint,
    sourceLabel: input.sourceMode === 'LOCAL_MINIMIZED_SHARE'
      ? 'Orario condiviso - derivato locale'
      : input.sourceMode === 'LOCAL_MINIMIZED_UPLOAD'
        ? 'Orario caricato - derivato locale'
        : input.sourceMode === 'LOCAL_RASTER_PAGE_SHARE'
          ? 'Orario condiviso - pagina immagine derivata localmente'
          : 'Orario caricato - pagina immagine derivata localmente',
    sourceRef: `client-whole-document-sha256:${wholeDocumentFingerprint}`,
  }
}

function validateFingerprint(value: string) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid source fingerprint')
  return value
}

