import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const render = fs.readFileSync(new URL('../../../../render.yaml', import.meta.url), 'utf8')
const start = fs.readFileSync(new URL('../../../scripts/start-production.mjs', import.meta.url), 'utf8')

test('beta declares timetable visual extraction secret without committing a value', () => {
  assert.match(render, /- key: OPENAI_TIMETABLE_API_KEY\s+sync: false/)
  assert.doesNotMatch(render, /OPENAI_TIMETABLE_API_KEY\s+value:/)
})

test('startup exposes only readiness state for timetable visual extraction', () => {
  assert.match(start, /Timetable visual extractor:/)
  assert.match(start, /'CONFIGURED' : 'UNAVAILABLE'/)
  assert.doesNotMatch(start, /console\.log\([^\n]*OPENAI_TIMETABLE_API_KEY/)
})
