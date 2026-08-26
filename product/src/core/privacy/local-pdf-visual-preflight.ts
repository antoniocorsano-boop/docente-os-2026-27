import { extractText, getDocumentProxy } from 'unpdf'

export const MAX_LOCAL_VISUAL_PDF_PAGES = 5

export type LocalPdfVisualPreflightState =
  | 'NATIVE_TEXT_ONLY'
  | 'SINGLE_PAGE_VISUAL_REVIEWABLE'
  | 'MULTI_PAGE_VISUAL_REVIEWABLE'
  | 'MULTI_PAGE_VISUAL_BLOCKED'
  | 'FAILED'

export type LocalPdfVisualPreflightResult = {
  state: LocalPdfVisualPreflightState
  totalPages: number | null
  missingNativeTextPages: number[]
}

export async function classifyLocalPdfForVisualPreflight(bytes: Uint8Array): Promise<LocalPdfVisualPreflightResult> {
  if (!bytes.length) return failed()

  try {
    const pdf = await getDocumentProxy(bytes)
    const { totalPages, text } = await extractText(pdf, { mergePages: false })
    const pages = Array.isArray(text) ? text.map((page) => normalizeText(String(page ?? ''))) : []
    return classifyPdfPages(totalPages, pages)
  } catch {
    return failed()
  }
}

export function classifyPdfPages(totalPages: number, pages: string[]): LocalPdfVisualPreflightResult {
  if (!Number.isInteger(totalPages) || totalPages < 1 || pages.length !== totalPages) return failed()

  const normalized = pages.map(normalizeText)
  const missingNativeTextPages = normalized.flatMap((page, index) => hasUsableText(page) ? [] : [index + 1])

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

function normalizeText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function hasUsableText(value: string) {
  const alphanumeric = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return alphanumeric >= 20
}

function failed(): LocalPdfVisualPreflightResult {
  return { state: 'FAILED', totalPages: null, missingNativeTextPages: [] }
}
