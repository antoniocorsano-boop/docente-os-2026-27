import assert from 'node:assert/strict'
import test from 'node:test'
import { extractText, getDocumentProxy } from 'unpdf'
import { buildSanitizedRasterTimetablePdf } from './timetable-real-fixture.mjs'

test('sanitized raster timetable fixture has no usable native text layer', async () => {
  const bytes = buildSanitizedRasterTimetablePdf()
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const extraction = await extractText(pdf, { mergePages: false })
  assert.equal(extraction.totalPages, 1)
  assert.deepEqual(extraction.text.map((page) => String(page ?? '').trim()), [''])
})
