import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const lessonSource = (name: string) =>
  readFileSync(new URL(`../../app/classi/[sectionId]/lezioni/[blockId]/${name}`, import.meta.url), 'utf8')

const shellSource = lessonSource('lesson-shell.tsx')
const prepareSource = lessonSource('lesson-prepare-client.tsx')
const liveSource = lessonSource('lesson-live-client.tsx')
const observeSource = lessonSource('lesson-observe-client.tsx')
const closeSource = lessonSource('lesson-close-client.tsx')

test('lesson workspace keeps one page h1 in LessonShell and none in phase clients', () => {
  assert.equal((shellSource.match(/<h1\b/g) ?? []).length, 1)

  for (const [phase, source] of [
    ['prepare', prepareSource],
    ['teach', liveSource],
    ['observe', observeSource],
    ['record', closeSource],
  ] as const) {
    assert.equal((source.match(/<h1\b/g) ?? []).length, 0, `${phase} must not declare a second h1`)
  }

  assert.doesNotMatch(prepareSource, /<h[1-6][^>]*>\{brief\.title\}<\/h[1-6]>/)
  assert.match(prepareSource, /<h2>Prepara la lezione<\/h2>/)
  assert.match(observeSource, /<h2>Guarda poche evidenze utili<\/h2>/)
})
