import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('next lesson preparation carries the existing human discipline label', async () => {
  const source = await readFile(new URL('./next-lesson-preparation.ts', import.meta.url), 'utf8')
  assert.match(source, /disciplineLabel:\s*input\.lessonContext\.discipline/)
})
