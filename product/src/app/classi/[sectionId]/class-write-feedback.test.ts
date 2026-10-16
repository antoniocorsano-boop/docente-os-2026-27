import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

/* @trama-feedback-test */

const actionsSource = fs.readFileSync('src/app/classi/[sectionId]/actions.ts', 'utf8')
const pageSource = fs.readFileSync('src/app/classi/[sectionId]/page.tsx', 'utf8')

test('class workspace writes redirect to persistent visible receipts', () => {
  assert.match(actionsSource, /\?session=\$\{encodeURIComponent\(receipt\.teachingSessionId\)\}/)
  assert.match(actionsSource, /&replanning=\$\{encodeURIComponent\(extension\.id\)\}/)
  assert.match(actionsSource, /\?recorded=\$\{encodeURIComponent\(blockId\)\}/)
  assert.match(pageSource, /classRecordFeedback/)
  assert.match(pageSource, /role="status"/)
  assert.match(pageSource, /aria-live="polite"/)
})
