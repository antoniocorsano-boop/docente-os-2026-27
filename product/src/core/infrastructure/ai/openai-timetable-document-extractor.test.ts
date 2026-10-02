import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { OpenAiTimetableDocumentExtractor } from './openai-timetable-document-extractor'

const expected = JSON.parse(
  fs.readFileSync(new URL('../../../../e2e/fixtures/timetable-real-shape-28-09-2026.expected.json', import.meta.url), 'utf8'),
) as {
  teacherLabel: string
  expectedLessons: Array<{ day: string; ordinal: number; classLabel: string }>
}

const weekday = new Map([
  ['Lunedì', 1],
  ['Martedì', 2],
  ['Mercoledì', 3],
  ['Giovedì', 4],
  ['Venerdì', 5],
  ['Sabato', 6],
])

test('visual timetable extractor returns the exact sanitized 14-lesson baseline without network', async () => {
  const rows = expected.expectedLessons.map((lesson) => ({
    day: weekday.get(lesson.day),
    ordinal: lesson.ordinal,
    classLabel: lesson.classLabel,
    sourceTeacherLabel: expected.teacherLabel,
    confidence: 0.97,
    page: 1,
  }))

  rows.push({ ...rows[0] })
  rows.push({
    day: 1,
    ordinal: 1,
    classLabel: '1B',
    sourceTeacherLabel: 'Altro docente',
    confidence: 0.99,
    page: 1,
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    output_text: JSON.stringify({ rows }),
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch

  try {
    const extractor = new OpenAiTimetableDocumentExtractor('test-key', 'test-vision-model')
    const result = await extractor.extract({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png',
      filename: 'orario-pagine-immagine.png',
      teacherLabel: expected.teacherLabel,
      knownClassLabels: ['1A','2A','3A','1C','2C','3C','3E'],
    })

    assert.equal(result.rows.length, 14)
    assert.equal(result.processor, 'openai-responses-timetable-extraction')
    assert.equal(result.processorVersion, 'test-vision-model')
    assert.deepEqual(
      result.rows.map((row) => ({ day: row.day, ordinal: row.ordinal, classLabel: row.classLabel })),
      expected.expectedLessons.map((lesson) => ({
        day: weekday.get(lesson.day),
        ordinal: lesson.ordinal,
        classLabel: lesson.classLabel,
      })),
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
