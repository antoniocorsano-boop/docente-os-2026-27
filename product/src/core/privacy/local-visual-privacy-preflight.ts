import { inspectFreeTextForPilot } from './anonymization-guard'

export const REQUIRED_LOCAL_VISUAL_CAPABILITIES = [
  'OCR_TEXT',
  'FACE_LIKENESS',
  'BARCODE_QR',
  'IMAGE_METADATA',
] as const

export type LocalVisualCapability = (typeof REQUIRED_LOCAL_VISUAL_CAPABILITIES)[number]

export type LocalVisualPrivacySignal =
  | 'FACE_LIKENESS'
  | 'BARCODE_QR'
  | 'DOCUMENT_OR_CARD_LIKENESS'
  | 'UNVERIFIED_VISUAL_CONTENT'

export type LocalVisualInspection =
  | {
      status: 'PASS'
      extractedText: string
      inspectedRegions: number
      signals: LocalVisualPrivacySignal[]
    }
  | { status: 'BLOCK'; reason: string; signals: LocalVisualPrivacySignal[] }
  | { status: 'FAILED'; reason: string }

export type LocalVisualPrivacyInspector = {
  execution: 'LOCAL'
  externalNetworkAccess: false
  capabilities: readonly LocalVisualCapability[]
  inspect(input: { bytes: Uint8Array; mimeType: string }): Promise<LocalVisualInspection>
}

export type EvaluatedLocalVisualPreflight =
  | { allowed: true; mode: 'LOCAL_VISUAL_PREFLIGHT'; inspectedCharacters: number; inspectedRegions: number }
  | { allowed: false; code: 'privacy_blocked' | 'privacy_preflight_unavailable' | 'privacy_preflight_failed'; reason: string }

export async function evaluateLocalVisualPreflight(input: {
  bytes: Uint8Array
  mimeType: string
  inspector?: LocalVisualPrivacyInspector
}): Promise<EvaluatedLocalVisualPreflight> {
  const inspector = input.inspector
  if (!inspector) return unavailable('Il motore visuale locale non è collegato: il contenuto resta bloccato prima della persistenza.')
  if (inspector.execution !== 'LOCAL' || inspector.externalNetworkAccess !== false) {
    return unavailable('Il preflight visuale privacy deve essere eseguito localmente e senza accesso a servizi esterni.')
  }

  const missingCapabilities = REQUIRED_LOCAL_VISUAL_CAPABILITIES.filter(
    (capability) => !inspector.capabilities.includes(capability),
  )
  if (missingCapabilities.length > 0) {
    return unavailable(`Copertura visuale locale incompleta: ${missingCapabilities.join(', ')}.`)
  }

  try {
    const inspection = await inspector.inspect({ bytes: input.bytes, mimeType: input.mimeType })
    if (inspection.status === 'FAILED') return failed(inspection.reason)
    if (inspection.status === 'BLOCK') return blocked(inspection.reason)
    if (inspection.signals.length > 0) return blocked('Il contenuto visuale presenta segnali non ammessi nel pilot anonimo.')

    const text = normalizeText(inspection.extractedText)
    if (text) {
      const privacy = inspectFreeTextForPilot(text)
      if (!privacy.allowed) return blocked('Il testo rilevato nel contenuto visuale presenta segnali di dati non ammessi nel pilot anonimo.')
    }

    return {
      allowed: true,
      mode: 'LOCAL_VISUAL_PREFLIGHT',
      inspectedCharacters: text.length,
      inspectedRegions: inspection.inspectedRegions,
    }
  } catch {
    return failed('Il motore visuale locale non ha completato il preflight in modo affidabile.')
  }
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function blocked(reason: string): EvaluatedLocalVisualPreflight {
  return { allowed: false, code: 'privacy_blocked', reason }
}

function unavailable(reason: string): EvaluatedLocalVisualPreflight {
  return { allowed: false, code: 'privacy_preflight_unavailable', reason }
}

function failed(reason: string): EvaluatedLocalVisualPreflight {
  return { allowed: false, code: 'privacy_preflight_failed', reason }
}
