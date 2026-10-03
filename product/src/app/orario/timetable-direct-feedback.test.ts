import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
test('manual timetable write keeps persistent visible state and explicit activation boundary', () => {
  const experience = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')
  const grid = readFileSync(new URL('./TimetableGrid.tsx', import.meta.url), 'utf8')

  assert.match(experience, /Le modifiche restano nella bozza finché non decidi di metterla in uso/)
  assert.match(experience, /Salva data di validità/)
  assert.match(experience, /Controlla e metti in uso la bozza/)
  assert.match(experience, /In uso dal/)
  assert.match(grid, /aria-live="polite"/)
})
