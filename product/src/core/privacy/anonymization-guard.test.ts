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

test('allows a teacher guide to discuss students, families and inclusion without identifying anyone', () => {
  const result = inspectFreeTextForPilot([
    'Idee per insegnare: strategie per lo studente con DSA e per gli studenti con BES.',
    'Il docente può usare PDP e PEI come riferimenti professionali e dialogare con la famiglia.',
    'Le attività inclusive vanno adattate ai bisogni della classe senza associare informazioni a una persona identificata.',
  ].join('\n'))
  assert.equal(result.allowed, true)
  assert.deepEqual(result.findings, [])
})

test('does not create D4-D5 findings from unrelated words in different parts of a long document', () => {
  const result = inspectFreeTextForPilot([
    'La guida descrive lo studente come protagonista del processo di apprendimento.',
    'Capitolo successivo: collaborazione con le famiglie e comunicazione scuola territorio.',
    'Appendice metodologica: DSA, BES, PDP, PEI e legge 104 come riferimenti generali per la progettazione inclusiva.',
  ].join('\n\n'))
  assert.equal(result.allowed, true)
  assert.deepEqual(result.findings, [])
})

test('allows technical numeric identifiers that are not presented as contacts', () => {
  const result = inspectFreeTextForPilot('UDA tecnica HVA classe prima — 32936721990')
  assert.equal(result.allowed, true)
})

test('blocks contextual phone numbers', () => {
  const result = inspectFreeTextForPilot('Telefono: 3293672199')
  assert.equal(result.allowed, false)
  assert.ok(result.findings.some((finding) => finding.riskClass === 'D3' && finding.code === 'PHONE'))
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

test('blocks a named student when the role follows the name', () => {
  const result = inspectFreeTextForPilot('Mario Rossi, studente della classe seconda, con diagnosi DSA.')
  assert.equal(result.allowed, false)
  assert.ok(result.findings.some((finding) => finding.code === 'NAMED_STUDENT'))
  assert.ok(result.findings.some((finding) => finding.riskClass === 'D5'))
})

test('blocks a numbered individual student reference with special-category context', () => {
  const result = inspectFreeTextForPilot('Studente n. 17 con PDP per DSA.')
  assert.equal(result.allowed, false)
  assert.ok(result.findings.some((finding) => finding.code === 'INDIVIDUAL_STUDENT_REFERENCE'))
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
