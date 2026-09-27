import assert from 'node:assert/strict'
import test from 'node:test'
import { extractTimetableImportDocument } from './timetable-import-document'

const fakePdf = new Uint8Array([37, 80, 68, 70])

test('rejects non-PDF input before document processing', async () => {
  await assert.rejects(
    extractTimetableImportDocument({ bytes: fakePdf, mimeType: 'image/jpeg', sourceName: 'orario.jpg' }),
    /TIMETABLE_IMPORT_PDF_ONLY/,
  )
})

test('rejects empty input', async () => {
  await assert.rejects(
    extractTimetableImportDocument({ bytes: new Uint8Array(), mimeType: 'application/pdf', sourceName: 'orario.pdf' }),
    /TIMETABLE_IMPORT_EMPTY_FILE/,
  )
})

test('rejects missing source name before PDF parsing', async () => {
  await assert.rejects(
    extractTimetableImportDocument({ bytes: fakePdf, mimeType: 'application/pdf', sourceName: '   ' }),
    /TIMETABLE_IMPORT_SOURCE_NAME_MISSING/,
  )
})

test('rejects oversized PDF before parsing', async () => {
  await assert.rejects(
    extractTimetableImportDocument({ bytes: new Uint8Array(10 * 1024 * 1024 + 1), mimeType: 'application/pdf', sourceName: 'orario.pdf' }),
    /TIMETABLE_IMPORT_FILE_TOO_LARGE/,
  )
})
