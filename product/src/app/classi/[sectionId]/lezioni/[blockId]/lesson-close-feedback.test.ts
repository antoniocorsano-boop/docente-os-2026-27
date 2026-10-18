import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

/* @trama-feedback-test */

const closeSource = fs.readFileSync(
  'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx',
  'utf8',
)
const continuePath = 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue.tsx'
const continueSource = fs.existsSync(continuePath) ? fs.readFileSync(continuePath, 'utf8') : ''

test('lesson registration exposes failure feedback and stays in the lesson task after success', () => {
  assert.match(closeSource, /role="alert"/)
  assert.match(closeSource, /LessonContinue/)
  assert.match(closeSource, /setContinuation/)
  assert.doesNotMatch(closeSource, /router\.push\(.*session=/s)
})

test('post-record Continua is a presentation-only state with explicit recovery actions', () => {
  assert.match(continueSource, /CONTINUA/)
  assert.match(continueSource, /Lezione registrata/)
  assert.match(continueSource, /Esito effettivo/)
  assert.match(continueSource, /Prepara la prossima/)
  assert.match(continueSource, /Torna a Oggi/)
})
