import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

/* @trama-feedback-test */

const source = fs.readFileSync('src/components/experience-feedback/experience-feedback.tsx', 'utf8')

test('lesson experience feedback exposes pending success and failure states', () => {
  assert.match(source, /pending\s*\?\s*['"]Invio…['"]/)
  assert.match(source, /state\.status\s*===\s*['"]success['"][\s\S]*role="status"/)
  assert.match(source, /state\.status\s*===\s*['"]error['"][\s\S]*role="alert"/)
})
