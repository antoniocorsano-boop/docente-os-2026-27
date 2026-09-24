import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
test('local profile exposes accessible save feedback', () => {
  const source = readFileSync(new URL('./local-user-profile.tsx', import.meta.url), 'utf8')
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /Profilo locale salvato sul dispositivo/)
  assert.match(source, /Profilo locale azzerato/)
})
