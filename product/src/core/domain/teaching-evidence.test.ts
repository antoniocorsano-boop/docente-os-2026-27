import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canApplyTeachingProposal,
  canInferLongitudinalSignal,
  deriveEvidenceCoverage,
  validateTeachingEvidenceDrafts,
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

test('draft validation rejects taxonomy drift and unresolved evidence links', () => {
  const result = validateTeachingEvidenceDrafts({
    observations: [{
      draftKey: 'o-1',
      scope: 'CLASS',
      anonymousGroupKey: null,
      dimensionKey: 'AUTONOMY',
      state: 'DEVELOPING',
      note: null,
      source: 'TEACHER_QUICK_MARK',
    }],
    evidenceReferences: [{
      kind: 'QUICK_CHECK',
      description: 'Exit ticket',
      observationDraftKeys: ['missing'],
      knowledgeAssetId: null,
      externalReference: null,
    }],
  })
  assert.equal(result.valid, false)
  assert.ok(result.codes.includes('UNKNOWN_OBSERVATION_DRAFT_KEY'))
})

test('draft validation accepts class and session-local anonymous-group observations', () => {
  assert.deepEqual(
    validateTeachingEvidenceDrafts({
      observations: [
        {
          draftKey: 'class-autonomy',
          scope: 'CLASS',
          anonymousGroupKey: null,
          dimensionKey: 'AUTONOMY',
          state: 'DEVELOPING',
          note: null,
          source: 'TEACHER_QUICK_MARK',
        },
        {
          draftKey: 'table-a-language',
          scope: 'ANONYMOUS_GROUP',
          anonymousGroupKey: 'table-a',
          dimensionKey: 'TECHNICAL_LANGUAGE',
          state: 'NEEDS_SUPPORT',
          note: 'Terminologia ancora incerta',
          source: 'TEACHER_NOTE',
        },
      ],
      evidenceReferences: [{
        kind: 'CLASS_ACTIVITY',
        description: 'Attività di quotatura',
        observationDraftKeys: ['class-autonomy', 'table-a-language'],
        knowledgeAssetId: null,
        externalReference: null,
      }],
    }),
    { valid: true, codes: [] },
  )
})

test('class observations cannot carry anonymous-group identifiers', () => {
  assert.ok(
    validateTeachingObservation(observation({ anonymousGroupKey: 'g1' })).includes(
      'CLASS observations cannot carry anonymousGroupKey',
    ),
  )
})

test('anonymous group observations require a non-identifying group key', () => {
  assert.ok(
    validateTeachingObservation(observation({ scope: 'ANONYMOUS_GROUP' })).includes(
      'ANONYMOUS_GROUP observations require anonymousGroupKey',
    ),
  )
})

test('a longitudinal signal cannot be inferred from one observed session', () => {
  assert.equal(canInferLongitudinalSignal({ observations: [observation()], comparableSessionIds: ['s1'] }), false)
})

test('NOT_OBSERVED and anonymous temporary groups never become a Tier 1 trend', () => {
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
  assert.equal(
    canInferLongitudinalSignal({
      observations: [
        observation({ scope: 'ANONYMOUS_GROUP', anonymousGroupKey: 'table-a' }),
        observation({ id: 'o2', teachingSessionId: 's2', scope: 'ANONYMOUS_GROUP', anonymousGroupKey: 'table-a' }),
      ],
      comparableSessionIds: ['s1', 's2'],
    }),
    false,
  )
})

test('longitudinal analysis requires two comparable class observations of the same dimension', () => {
  assert.equal(
    canInferLongitudinalSignal({
      observations: [observation(), observation({ id: 'o2', teachingSessionId: 's2' })],
      comparableSessionIds: ['s1', 's2'],
    }),
    true,
  )
  assert.equal(
    canInferLongitudinalSignal({
      observations: [observation(), observation({ id: 'o2', teachingSessionId: 's2', dimensionKey: 'TECHNICAL_LANGUAGE' })],
      comparableSessionIds: ['s1', 's2'],
    }),
    false,
  )
})

test('evidence coverage requires explicit same-session observation links and never becomes a score', () => {
  assert.equal(deriveEvidenceCoverage({ observations: [observation()], evidence: [] }), 'NONE')
  assert.equal(deriveEvidenceCoverage({ observations: [observation()], evidence: [evidence()] }), 'PRESENT')
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
