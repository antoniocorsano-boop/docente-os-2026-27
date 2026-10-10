import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

/* @trama-feedback-test */

const closeSource = fs.readFileSync(
  'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx',
  'utf8',
)
const classSource = fs.readFileSync(
  'src/app/classi/[sectionId]/page.tsx',
  'utf8',
)
const experienceFeedbackSource = fs.readFileSync(
  'src/components/experience-feedback/experience-feedback.tsx',
  'utf8',
)

test('lesson registration exposes failure and success feedback', () => {
  assert.match(closeSource, /role="alert"/)
  assert.match(closeSource, /router\.push\(.*session=/s)
  assert.match(classSource, /classRecordFeedback/)
  assert.match(classSource, /role="status"/)
  assert.match(classSource, /aria-live="polite"/)
})

test('lesson experience feedback exposes persistent success and error states', () => {
  assert.match(experienceFeedbackSource, /useActionState/)
  assert.match(experienceFeedbackSource, /state\.status === 'success'/)
  assert.match(experienceFeedbackSource, /role="status"/)
  assert.match(experienceFeedbackSource, /state\.status === 'error'/)
  assert.match(experienceFeedbackSource, /role="alert"/)
})
