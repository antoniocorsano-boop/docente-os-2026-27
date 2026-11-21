import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCurricoloWorkProposal,
  curricoloProposalAsMarkdown,
  curricoloReadingExcerpts,
  searchCurricoloExcerpts,
} from './cml-curricolo-workbench'
import type { ProvisionalTechnologyReference } from './cml-provisional-technology-reference'

const reference: ProvisionalTechnologyReference = {
  status: 'PROVISIONAL_NOT_IN_FORCE',
  source: 'CURMANLIGHT_ARENA',
  sourceVersion: '1.3',
  institutionIdDeclared: 'ics-lorenzo-milani',
  institutionIdentityVerified: false,
  gradeRef: 'grade-3',
  schoolYearRef: '2026/2027',
  framework: 'IN2012',
  segmentId: 'can-curr-master-00-secondaria-tecnologia-3',
  releaseStructuralFootprint: '99c4ccc3',
  nodeCount: 5,
  obiettivi: ['rappresentare soluzioni; analizzare sistemi energetici/produttivi; confrontare impatti'],
  conoscenze: ['progetto/rappresentazione; energia; ambiente'],
  evidenze: ['progetto; confronto di soluzioni; analisi di sistema'],
  writeAllowed: false,
  legacyReplacementAllowed: false,
}

test('Gli estratti preservano la fonte integrale e non introducono nodi curricolari', () => {
  const items = curricoloReadingExcerpts(reference)
  assert.equal(items.length, 9)
  const objective = items.find(item => item.text === 'analizzare sistemi energetici/produttivi')
  assert.ok(objective)
  assert.equal(objective.originalText, reference.obiettivi[0])
  assert.equal(objective.id, 'obiettivi:0:1')
  assert.equal(objective.editorialExcerpt, true)
  assert.equal(Object.keys(objective).includes('nodeId'), false)
})

test('La ricerca è normalizzata e richiede che le parole siano nello stesso estratto', () => {
  const items = curricoloReadingExcerpts(reference)
  assert.deepEqual(
    searchCurricoloExcerpts(items, '  SISTEMI   energetici ').map(item => item.id),
    ['obiettivi:0:1'],
  )
  assert.deepEqual(searchCurricoloExcerpts(items, 'energia').map(item => item.text), ['energia'])
  assert.equal(searchCurricoloExcerpts(items, 'energia assente').length, 0)
})

test('La proposta di UDA è una bozza personale, con provenienza e testo Arena immutato', () => {
  const selected = curricoloReadingExcerpts(reference).find(item => item.id === 'obiettivi:0:1')
  assert.ok(selected)
  const result = createCurricoloWorkProposal({
    reference, selected, kind: 'UDA', theme: 'Energia e ambiente', evidence: 'analisi di sistema',
  })
  assert.match(result.title, /^UDA · Energia e ambiente/)
  assert.equal(result.source.originalText, reference.obiettivi[0])
  assert.equal(result.source.authority, 'PROVISIONAL_NOT_IN_FORCE')
  assert.equal(result.evidence, 'analisi di sistema')
  assert.equal(result.task, '', 'La UDA richiede un compito scritto dal docente')
  assert.match(curricoloProposalAsMarkdown(result), /NON vigente e NON approvata/)
})

test('Testi inventati, evidenze estranee e fonti scrivibili vengono rifiutati', () => {
  const selected = curricoloReadingExcerpts(reference)[0]
  assert.throws(() => createCurricoloWorkProposal({
    reference, selected: { ...selected, text: 'obiettivo inventato' }, kind: 'ATTIVITA',
  }), /not backed/)
  assert.throws(() => createCurricoloWorkProposal({
    reference, selected, kind: 'LEZIONE', evidence: 'valutazione istituzionale approvata',
  }), /does not belong/)
  assert.throws(() => createCurricoloWorkProposal({
    reference: { ...reference, writeAllowed: true as unknown as false }, selected, kind: 'PERCORSO',
  }), /read-only/)
})

test('La tipologia della proposta non cambia né approva il riferimento', () => {
  const selected = curricoloReadingExcerpts(reference)[0]
  for (const kind of ['ATTIVITA', 'LEZIONE', 'UDA', 'PERCORSO'] as const) {
    const draft = createCurricoloWorkProposal({ reference, selected, kind })
    assert.ok(draft.title)
    assert.equal(draft.source.authority, 'PROVISIONAL_NOT_IN_FORCE')
    assert.equal(draft.source.segmentId, reference.segmentId)
  }
  assert.equal(reference.obiettivi[0], 'rappresentare soluzioni; analizzare sistemi energetici/produttivi; confrontare impatti')
})
