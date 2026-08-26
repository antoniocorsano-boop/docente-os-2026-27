import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import { inspectFreeTextForPilot } from './anonymization-guard'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PNG_MIME = 'image/png'
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
const PNG_METADATA_CHUNKS = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'])

export type BinaryPrivacyPreflightCode =
  | 'privacy_blocked'
  | 'privacy_preflight_unavailable'
  | 'privacy_preflight_failed'

export type BinaryPrivacyPreflightResult =
  | {
      allowed: true
      mode: 'PDF_NATIVE_TEXT' | 'DOCX_TEXT_ONLY' | 'IMAGE_LOCAL_REVIEWED_PNG'
      inspectedCharacters: number
    }
  | { allowed: false; code: BinaryPrivacyPreflightCode; reason: string }

export async function inspectBinaryForAnonymousPilot(input: {
  bytes: Uint8Array
  mimeType: string
  localVisualReview?: boolean
}): Promise<BinaryPrivacyPreflightResult> {
  if (input.mimeType.startsWith('image/')) {
    if (input.mimeType !== PNG_MIME || input.localVisualReview !== true) {
      return unavailable('Le immagini sono ammesse solo come copia PNG ricodificata dopo revisione visuale locale nel browser.')
    }
    return inspectLocallyReviewedPng(input.bytes)
  }

  if (input.mimeType === DOCX_MIME) return inspectDocx(input.bytes)
  if (input.mimeType === PDF_MIME) return inspectPdf(input.bytes)

  return unavailable('Formato binario non coperto dal preflight anonimo.')
}

export function docxContainsEmbeddedMedia(bytes: Uint8Array) {
  // I nomi delle entry ZIP sono presenti in chiaro nelle directory del contenitore DOCX.
  return Buffer.from(bytes).includes(Buffer.from('word/media/'))
}

export function inspectLocallyReviewedPng(bytes: Uint8Array): BinaryPrivacyPreflightResult {
  if (!hasPngSignature(bytes)) return failed('La copia visuale dichiarata non è un PNG valido.')

  const chunkResult = inspectPngChunks(bytes)
  if (!chunkResult.valid) return failed('La copia PNG non ha una struttura verificabile prima della persistenza.')
  if (chunkResult.metadataChunks.length) {
    return {
      allowed: false,
      code: 'privacy_blocked',
      reason: `La copia PNG contiene metadata non ammessi nel pilot anonimo: ${chunkResult.metadataChunks.join(', ')}.`,
    }
  }

  return { allowed: true, mode: 'IMAGE_LOCAL_REVIEWED_PNG', inspectedCharacters: 0 }
}

async function inspectDocx(bytes: Uint8Array): Promise<BinaryPrivacyPreflightResult> {
  if (!bytes.length) return failed('DOCX vuoto o illeggibile.')
  if (docxContainsEmbeddedMedia(bytes)) {
    return unavailable('Il DOCX contiene immagini o media incorporati che il preflight locale non può ancora verificare.')
  }

  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    const text = normalizeText(result.value)
    if (!hasUsableText(text)) return unavailable('Il DOCX non contiene testo sufficiente per un controllo affidabile prima della persistenza.')
    const privacy = inspectFreeTextForPilot(text)
    if (!privacy.allowed) return blocked()
    return { allowed: true, mode: 'DOCX_TEXT_ONLY', inspectedCharacters: text.length }
  } catch {
    return failed('Il DOCX non può essere analizzato in modo affidabile prima della persistenza.')
  }
}

async function inspectPdf(bytes: Uint8Array): Promise<BinaryPrivacyPreflightResult> {
  if (!bytes.length) return failed('PDF vuoto o illeggibile.')

  try {
    const pdf = await getDocumentProxy(bytes)
    const { totalPages, text } = await extractText(pdf, { mergePages: false })
    const pages = Array.isArray(text) ? text.map((page) => normalizeText(String(page ?? ''))) : []
    if (!totalPages || pages.length !== totalPages) return unavailable('Il PDF non espone tutte le pagine al controllo testuale locale.')
    if (pages.some((page) => !hasUsableText(page))) {
      return unavailable('Il PDF contiene almeno una pagina senza testo nativo sufficiente; potrebbe richiedere lettura visuale.')
    }

    const merged = pages.join('\n\n')
    const privacy = inspectFreeTextForPilot(merged)
    if (!privacy.allowed) return blocked()
    return { allowed: true, mode: 'PDF_NATIVE_TEXT', inspectedCharacters: merged.length }
  } catch {
    return failed('Il PDF non può essere analizzato in modo affidabile prima della persistenza.')
  }
}

function hasPngSignature(bytes: Uint8Array) {
  return bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((value, index) => bytes[index] === value)
}

function inspectPngChunks(bytes: Uint8Array): { valid: boolean; metadataChunks: string[] } {
  const metadataChunks: string[] = []
  let offset: number = PNG_SIGNATURE.length
  let sawIhdr = false
  let sawIend = false

  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset)
    const typeOffset = offset + 4
    const dataOffset = typeOffset + 4
    const nextOffset = dataOffset + length + 4
    if (nextOffset > bytes.length) return { valid: false, metadataChunks }

    const type = String.fromCharCode(bytes[typeOffset], bytes[typeOffset + 1], bytes[typeOffset + 2], bytes[typeOffset + 3])
    if (!sawIhdr && type !== 'IHDR') return { valid: false, metadataChunks }
    if (type === 'IHDR') sawIhdr = true
    if (PNG_METADATA_CHUNKS.has(type) && !metadataChunks.includes(type)) metadataChunks.push(type)
    if (type === 'IEND') {
      sawIend = true
      offset = nextOffset
      break
    }
    offset = nextOffset
  }

  return { valid: sawIhdr && sawIend && offset === bytes.length, metadataChunks }
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function hasUsableText(value: string) {
  const alphanumeric = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return alphanumeric >= 20
}

function blocked(): BinaryPrivacyPreflightResult {
  return { allowed: false, code: 'privacy_blocked', reason: 'Il contenuto contiene segnali di dati non ammessi nel pilot anonimo.' }
}

function unavailable(reason: string): BinaryPrivacyPreflightResult {
  return { allowed: false, code: 'privacy_preflight_unavailable', reason }
}

function failed(reason: string): BinaryPrivacyPreflightResult {
  return { allowed: false, code: 'privacy_preflight_failed', reason }
}
