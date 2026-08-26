import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectFilenameForPilot, inspectFreeTextForPilot, pilotPrivacyErrorMessage } from './anonymization-guard'

test('allows ordinary D0-D1 teaching text', () => {
  const result = inspectFreeTextForPilot('UDA energia: 8 studenti su 20 hanno completato la consegna.')
  assert.equal(result.allowed, true)
  assert.deepEqual(result.findings, [])
})

test('allows generic pedagogical references without an identified person', () => {
  const result = inspectFreeTextForPilot('Strategie inclusive per DSA e BES; predisporre modelli PDP e PEI.')
  assert.equal(result.allowed, true)
})

test('blocks direct identifiers', () => {
  const result = inspectFreeTextForPilot('Contattare mario.rossi@example.it per il recupero.')
  assert.equal(result.allowed, false)
  assert.ok(result.findings.some((finding) => finding.riskClass === 'D3' && finding.code === 'EMAIL'))
})

test('blocks named student plus special-category context', () => {
  const result = inspectFreeTextForPilot('Studente Mario Rossi: predisporre PDP per DSA.')
  assert.equal(result.allowed, false)
  assert.ok(result.findings.some((finding) => finding.riskClass === 'D3' && finding.code === 'NAMED_STUDENT'))
  assert.ok(result.findings.some((finding) => finding.riskClass === 'D5'))
})

test('checks filenames before upload for direct identifiers', () => {
  const result = inspectFilenameForPilot('studente_Mario_Rossi_relazione.pdf')
  assert.equal(result.allowed, false)
})

test('returns a human-readable refusal without echoing source text', () => {
  const result = inspectFreeTextForPilot('CF RSSMRA80A01H501U')
  const message = pilotPrivacyErrorMessage(result)
  assert.match(message ?? '', /codice fiscale/)
  assert.doesNotMatch(message ?? '', /RSSMRA80A01H501U/)
})
