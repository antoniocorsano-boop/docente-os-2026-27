import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
test('timetable import exposes persistent accessible success and failure feedback', () => {
  const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
  assert.match(source, /role="status"/)
  assert.match(source, /Orario applicato alla bozza/)
  assert.match(source, /Applicazione non riuscita/)
  assert.match(source, /La bozza è cambiata/)
  assert.match(source, /La transazione è stata annullata/)
})
