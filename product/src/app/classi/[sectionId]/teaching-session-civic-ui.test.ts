import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isCivicEducationMinutesInvalid } from './teaching-session-civic-form'

const recorderSource = readFileSync(new URL('./TeachingSessionRecorderClient.tsx', import.meta.url), 'utf8')

test('QL2-A civic disclosure stays optional and validates minutes against the real lesson duration', () => {
  assert.equal(isCivicEducationMinutesInvalid({ enabled: false, minutes: 0, actualMinutes: 60 }), false)
  assert.equal(isCivicEducationMinutesInvalid({ enabled: true, minutes: 20, actualMinutes: 60 }), false)
  assert.equal(isCivicEducationMinutesInvalid({ enabled: true, minutes: 0, actualMinutes: 60 }), true)
  assert.equal(isCivicEducationMinutesInvalid({ enabled: true, minutes: 61, actualMinutes: 60 }), true)
  assert.equal(isCivicEducationMinutesInvalid({ enabled: true, minutes: 20.5, actualMinutes: 60 }), true)
})

test('QL2-A recorder reveals civic fields only after an explicit teacher choice', () => {
  assert.match(recorderSource, /Questa lezione contribuisce anche a Educazione civica/)
  assert.match(recorderSource, /const \[civicEducationEnabled, setCivicEducationEnabled\] = useState\(false\)/)
  assert.match(
    recorderSource,
    /civicEducationEnabled\s*\?\s*\([\s\S]*name="civicEducationMinutes"[\s\S]*name="civicEducationEvidenceNote"[\s\S]*\)\s*:\s*null/,
  )
})

test('QL2-A recorder makes the civic contribution participate in submit validity', () => {
  assert.match(recorderSource, /isCivicEducationMinutesInvalid\([\s\S]*enabled:\s*civicEducationEnabled[\s\S]*actualMinutes[\s\S]*\)/)
  assert.match(recorderSource, /const invalid = [^\n]*civicEducationInvalid/)
})
