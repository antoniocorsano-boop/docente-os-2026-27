import mammoth from 'mammoth'
import { extractText, getDocumentProxy } from 'unpdf'
import { inspectFreeTextForPilot } from './anonymization-guard'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type BinaryPrivacyPreflightCode =
  | 'privacy_blocked'
  | 'privacy_preflight_unavailable'
  | 'privacy_preflight_failed'

export type BinaryPrivacyPreflightResult =
  | { allowed: true; mode: 'PDF_NATIVE_TEXT' | 'DOCX_TEXT_ONLY'; inspectedCharacters: number }
  | { allowed: false; code: BinaryPrivacyPreflightCode; reason: string }

export async function inspectBinaryForAnonymousPilot(input: {
  bytes: Uint8Array
  mimeType: string
}): Promise<BinaryPrivacyPreflightResult> {
  if (input.mimeType.startsWith('image/')) {
    return unavailable('Le immagini richiedono un preflight visuale locale prima di poter essere ammesse nel pilot anonimo.')
  }

  if (input.mimeType === DOCX_MIME) return inspectDocx(input.bytes)
  if (input.mimeType === PDF_MIME) return inspectPdf(input.bytes)

  return unavailable('Formato binario non coperto dal preflight anonimo.')
}

export function docxContainsEmbeddedMedia(bytes: Uint8Array) {
  // I nomi delle entry ZIP sono presenti in chiaro nelle directory del contenitore DOCX.
  return Buffer.from(bytes).includes(Buffer.from('word/media/'))
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
