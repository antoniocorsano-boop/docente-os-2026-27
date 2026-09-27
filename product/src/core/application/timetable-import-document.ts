import { UnpdfNativeTextExtraction } from '@/core/infrastructure/knowledge/file-transformers'

const PDF_MIME = 'application/pdf'
const MAX_TIMETABLE_PDF_BYTES = 10 * 1024 * 1024

export type TimetableImportDocument = {
  sourceName: string
  sourceKind: 'DOCUMENT'
  text: string
  pageCount: number
  extractionMethod: 'NATIVE_TEXT'
  requiresHumanReview: true
}

export async function extractTimetableImportDocument(input: {
  bytes: Uint8Array
  mimeType: string
  sourceName: string
}): Promise<TimetableImportDocument> {
  if (input.mimeType !== PDF_MIME) throw new Error('TIMETABLE_IMPORT_PDF_ONLY')
  if (!input.bytes.length) throw new Error('TIMETABLE_IMPORT_EMPTY_FILE')
  if (input.bytes.length > MAX_TIMETABLE_PDF_BYTES) throw new Error('TIMETABLE_IMPORT_FILE_TOO_LARGE')

  const sourceName = input.sourceName.trim()
  if (!sourceName) throw new Error('TIMETABLE_IMPORT_SOURCE_NAME_MISSING')

  const native = await new UnpdfNativeTextExtraction().extract(input.bytes)
  const pages = native.pages.map(normalizePageText)
  if (!pages.length || pages.some((page) => !isUsableTimetableText(page))) {
    throw new Error('TIMETABLE_IMPORT_NATIVE_TEXT_INCOMPLETE')
  }

  return {
    sourceName,
    sourceKind: 'DOCUMENT',
    text: pages.join('\n\n'),
    pageCount: native.totalPages,
    extractionMethod: 'NATIVE_TEXT',
    requiresHumanReview: true,
  }
}

function normalizePageText(value: string) {
  return value.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function isUsableTimetableText(value: string) {
  const alphanumeric = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0
  return alphanumeric >= 20
}
