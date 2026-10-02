import { extractText, getDocumentProxy } from 'unpdf'
import {
  inspectFreeTextForPilot,
  pilotPrivacyErrorMessage,
  sanitizeContactIdentifiersForPilot,
} from './anonymization-guard'
import { hasUsablePdfText, normalizePdfExtractedText } from './pdf-text-usability'

export const MAX_LOCAL_VISUAL_PDF_PAGES = 5

export type LocalPdfVisualPreflightState =
  | 'NATIVE_TEXT_ONLY'
  | 'NATIVE_TEXT_PRIVACY_BLOCKED'
  | 'SINGLE_PAGE_VISUAL_REVIEWABLE'
  | 'MULTI_PAGE_VISUAL_REVIEWABLE'
  | 'MULTI_PAGE_VISUAL_BLOCKED'
  | 'FAILED'

export type LocalPdfVisualPreflightDiagnostic =
  | 'DOCUMENT_OPEN_FAILED'
  | 'TEXT_EXTRACTION_FAILED_VISUAL_FALLBACK'

export type LocalPdfVisualPreflightResult = {
  state: LocalPdfVisualPreflightState
  totalPages: number | null
  missingNativeTextPages: number[]
  diagnostic?: LocalPdfVisualPreflightDiagnostic
  nativeTextPrivacy?: 'PASSED' | 'BLOCKED'
  privacyMessage?: string
  sanitizedNativeText?: string
  sanitizedLabels?: string[]
}

export async function classifyLocalPdfForVisualPreflight(bytes: Uint8Array): Promise<LocalPdfVisualPreflightResult> {
  if (!bytes.length) return failed('DOCUMENT_OPEN_FAILED')

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>
  try {
    pdf = await getDocumentProxy(bytes)
  } catch {
    return failed('DOCUMENT_OPEN_FAILED')
  }

  let totalPages: number
  let text: unknown
  try {
    const extraction = await extractText(pdf, { mergePages: false })
    totalPages = extraction.totalPages
    text = extraction.text
  } catch {
    return classifyTextExtractionFailure(pdf.numPages)
  }

  const pages = Array.isArray(text) ? text.map((page) => normalizePdfExtractedText(String(page ?? ''))) : []
  const classification = classifyPdfPages(totalPages, pages)
  if (classification.state !== 'NATIVE_TEXT_ONLY') return classification

  const nativeText = pages.join('\n\n')
  const privacy = inspectFreeTextForPilot(nativeText)
  if (!privacy.allowed) {
    const sanitization = sanitizeContactIdentifiersForPilot(nativeText)
    return {
      ...classification,
      state: 'NATIVE_TEXT_PRIVACY_BLOCKED',
      nativeTextPrivacy: 'BLOCKED',
      privacyMessage: pilotPrivacyErrorMessage(privacy) ?? 'Il PDF contiene dati non ammessi nel pilot anonimo.',
      ...(sanitization.allowed ? {
        sanitizedNativeText: sanitization.sanitizedText,
        sanitizedLabels: sanitization.removedLabels,
      } : {}),
    }
  }

  return { ...classification, nativeTextPrivacy: 'PASSED' }
}

export function classifyTextExtractionFailure(totalPages: number): LocalPdfVisualPreflightResult {
  if (!Number.isInteger(totalPages) || totalPages < 1) return failed('DOCUMENT_OPEN_FAILED')

  const missingNativeTextPages = Array.from({ length: totalPages }, (_, index) => index + 1)
  const diagnostic: LocalPdfVisualPreflightDiagnostic = 'TEXT_EXTRACTION_FAILED_VISUAL_FALLBACK'

  if (totalPages === 1) {
    return { state: 'SINGLE_PAGE_VISUAL_REVIEWABLE', totalPages, missingNativeTextPages, diagnostic }
  }

  if (totalPages <= MAX_LOCAL_VISUAL_PDF_PAGES) {
    return { state: 'MULTI_PAGE_VISUAL_REVIEWABLE', totalPages, missingNativeTextPages, diagnostic }
  }

  return { state: 'MULTI_PAGE_VISUAL_BLOCKED', totalPages, missingNativeTextPages, diagnostic }
}

export function classifyPdfPages(totalPages: number, pages: string[]): LocalPdfVisualPreflightResult {
  if (!Number.isInteger(totalPages) || totalPages < 1 || pages.length !== totalPages) return failed('DOCUMENT_OPEN_FAILED')

  const normalized = pages.map(normalizeText)
  const missingNativeTextPages = normalized.flatMap((page, index) => hasUsablePdfText(page) ? [] : [index + 1])

  if (missingNativeTextPages.length === 0) {
    return { state: 'NATIVE_TEXT_ONLY', totalPages, missingNativeTextPages }
  }

  if (totalPages === 1 && missingNativeTextPages.length === 1) {
    return { state: 'SINGLE_PAGE_VISUAL_REVIEWABLE', totalPages, missingNativeTextPages }
  }

  if (totalPages <= MAX_LOCAL_VISUAL_PDF_PAGES) {
    return { state: 'MULTI_PAGE_VISUAL_REVIEWABLE', totalPages, missingNativeTextPages }
  }

  return { state: 'MULTI_PAGE_VISUAL_BLOCKED', totalPages, missingNativeTextPages }
}

function failed(diagnostic: LocalPdfVisualPreflightDiagnostic): LocalPdfVisualPreflightResult {
  return { state: 'FAILED', totalPages: null, missingNativeTextPages: [], diagnostic }
}
