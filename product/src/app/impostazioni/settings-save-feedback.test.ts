import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
test('settings page exposes persistent accessible save feedback', () => {
  const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
  assert.match(source, /role="status"/)
  assert.match(source, /Contesto professionale salvato/)
})
