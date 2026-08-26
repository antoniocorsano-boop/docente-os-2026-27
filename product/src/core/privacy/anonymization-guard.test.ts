import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectFilenameForPilot, inspectFreeTextForPilot, pilotPrivacyErrorMessage } from './anonymization-guard'

test('allows ordinary D0-D1 teaching text', () => {
  const result = inspectFreeTextForPilot('UDA energia: 8 studenti su 20 hanno completato la consegna.')
  assert.equal(result.allowed, true)
  assert.deepEqual(result.findings, [])
})

test('blocks direct identifiers', () => {
  const result = inspectFreeTextForPilot('Contattare mario.rossi@example.it per il recupero.')
  assert.equal(result.allowed, false)
  assert.ok(result.findings.some((finding) => finding.riskClass === 'D3' && finding.code === 'EMAIL'))
})

test('blocks special-category indicators', () => {
  const result = inspectFreeTextForPilot('Predisporre il PDP per DSA.')
  assert.equal(result.allowed, false)
  assert.ok(result.findings.some((finding) => finding.riskClass === 'D5'))
})

test('checks filenames before upload', () => {
  const result = inspectFilenameForPilot('PDP_DSA_classe2C.pdf')
  assert.equal(result.allowed, false)
})

test('returns a human-readable refusal without echoing source text', () => {
  const result = inspectFreeTextForPilot('CF RSSMRA80A01H501U')
  const message = pilotPrivacyErrorMessage(result)
  assert.match(message ?? '', /codice fiscale/)
  assert.doesNotMatch(message ?? '', /RSSMRA80A01H501U/)
})
