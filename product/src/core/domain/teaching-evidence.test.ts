import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canApplyTeachingProposal,
  canInferLongitudinalSignal,
  deriveEvidenceCoverage,
  validateTeachingObservation,
  type TeachingEvidenceReference,
  type TeachingObservation,
  type TeachingProposal,
} from './teaching-evidence'

function observation(overrides: Partial<TeachingObservation> = {}): TeachingObservation {
  return {
    id: 'o1',
    teachingSessionId: 's1',
    recordedBy: 'teacher-1',
    scope: 'CLASS',
    anonymousGroupKey: null,
    dimensionKey: 'AUTONOMY',
    state: 'DEVELOPING',
    note: null,
    source: 'TEACHER_QUICK_MARK',
    createdAt: '2026-09-14T10:00:00+02:00',
    ...overrides,
  }
}

function evidence(overrides: Partial<TeachingEvidenceReference> = {}): TeachingEvidenceReference {
  return {
    id: 'e1',
    teachingSessionId: 's1',
    observationIds: ['o1'],
    recordedBy: 'teacher-1',
    kind: 'QUICK_CHECK',
    description: 'Verifica rapida di fine lezione',
    knowledgeAssetId: null,
    externalReference: null,
    createdAt: '2026-09-14T10:00:00+02:00',
    ...overrides,
  }
}

function proposal(overrides: Partial<TeachingProposal> = {}): TeachingProposal {
  return {
    id: 'p1',
    sectionId: 'section-2c',
    rationale: 'Segnale ricorrente sulla quotatura',
    proposedAction: 'Riprendere le regole di quotatura',
    evidenceRefs: ['e1'],
    status: 'PROPOSED',
    humanDecisionAt: null,
    ...overrides,
  }
}

test('class observations cannot carry anonymous-group identifiers', () => {
  assert.ok(
    validateTeachingObservation(observation({ anonymousGroupKey: 'g1' })).includes(
      'CLASS observations cannot carry anonymousGroupKey',
    ),
  )
})

test('observations require explicit recorder provenance', () => {
  assert.ok(
    validateTeachingObservation(observation({ recordedBy: '' })).includes('recordedBy is required'),
  )
})

test('anonymous group observations require a non-identifying group key', () => {
  assert.ok(
    validateTeachingObservation(observation({ scope: 'ANONYMOUS_GROUP' })).includes(
      'ANONYMOUS_GROUP observations require anonymousGroupKey',
    ),
  )
  assert.deepEqual(
    validateTeachingObservation(
      observation({ scope: 'ANONYMOUS_GROUP', anonymousGroupKey: 'table-a' }),
    ),
    [],
  )
})

test('a longitudinal signal cannot be inferred from one observed session', () => {
  assert.equal(
    canInferLongitudinalSignal({
      observations: [observation()],
      comparableSessionIds: ['s1'],
    }),
    false,
  )
})

test('NOT_OBSERVED never counts as evidence for a trend', () => {
  assert.equal(
    canInferLongitudinalSignal({
      observations: [
        observation(),
        observation({ id: 'o2', teachingSessionId: 's2', state: 'NOT_OBSERVED' }),
      ],
      comparableSessionIds: ['s1', 's2'],
    }),
    false,
  )
})

test('longitudinal analysis requires at least two comparable observed sessions', () => {
  assert.equal(
    canInferLongitudinalSignal({
      observations: [observation(), observation({ id: 'o2', teachingSessionId: 's2' })],
      comparableSessionIds: ['s1', 's2'],
    }),
    true,
  )
})

test('evidence coverage requires explicit links to observations and never becomes a score', () => {
  assert.equal(deriveEvidenceCoverage({ observations: [observation()], evidence: [] }), 'NONE')
  assert.equal(
    deriveEvidenceCoverage({ observations: [observation()], evidence: [evidence()] }),
    'PRESENT',
  )
  assert.equal(
    deriveEvidenceCoverage({ observations: [observation()], evidence: [evidence({ observationIds: [] })] }),
    'NONE',
  )
  assert.equal(
    deriveEvidenceCoverage({
      observations: [observation(), observation({ id: 'o2', teachingSessionId: 's2' })],
      evidence: [evidence()],
    }),
    'PARTIAL',
  )
})

test('an evidence link cannot cover an observation from another teaching session', () => {
  assert.equal(
    deriveEvidenceCoverage({
      observations: [observation({ id: 'o2', teachingSessionId: 's2' })],
      evidence: [evidence({ teachingSessionId: 's1', observationIds: ['o2'] })],
    }),
    'NONE',
  )
})

test('teaching proposals require an explicit human decision before apply', () => {
  assert.equal(canApplyTeachingProposal(proposal()), false)
  assert.equal(canApplyTeachingProposal(proposal({ status: 'DISMISSED' })), false)
  assert.equal(canApplyTeachingProposal(proposal({ status: 'ACCEPTED' })), true)
  assert.equal(canApplyTeachingProposal(proposal({ status: 'MODIFIED' })), true)
})
