import { describe, expect, it } from 'vitest'
import {
  canApplyTeachingProposal,
  canInferLongitudinalSignal,
  deriveEvidenceCoverage,
  validateTeachingObservation,
  type TeachingEvidence,
  type TeachingObservation,
  type TeachingProposal,
} from './teaching-evidence'

function observation(overrides: Partial<TeachingObservation> = {}): TeachingObservation {
  return {
    id: 'o1',
    teachingSessionId: 's1',
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

function evidence(overrides: Partial<TeachingEvidence> = {}): TeachingEvidence {
  return {
    id: 'e1',
    teachingSessionId: 's1',
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

describe('teaching evidence domain', () => {
  it('keeps class observations free of anonymous-group identifiers', () => {
    expect(validateTeachingObservation(observation({ anonymousGroupKey: 'g1' }))).toContain(
      'CLASS observations cannot carry anonymousGroupKey',
    )
  })

  it('requires a non-identifying group key only for anonymous group observations', () => {
    expect(validateTeachingObservation(observation({ scope: 'ANONYMOUS_GROUP' }))).toContain(
      'ANONYMOUS_GROUP observations require anonymousGroupKey',
    )
    expect(
      validateTeachingObservation(
        observation({ scope: 'ANONYMOUS_GROUP', anonymousGroupKey: 'table-a' }),
      ),
    ).toEqual([])
  })

  it('does not infer a longitudinal signal from one observed session', () => {
    expect(
      canInferLongitudinalSignal({
        observations: [observation()],
        comparableSessionIds: ['s1'],
      }),
    ).toBe(false)
  })

  it('does not count NOT_OBSERVED as evidence for a trend', () => {
    expect(
      canInferLongitudinalSignal({
        observations: [
          observation(),
          observation({ id: 'o2', teachingSessionId: 's2', state: 'NOT_OBSERVED' }),
        ],
        comparableSessionIds: ['s1', 's2'],
      }),
    ).toBe(false)
  })

  it('allows longitudinal analysis only across at least two comparable observed sessions', () => {
    expect(
      canInferLongitudinalSignal({
        observations: [observation(), observation({ id: 'o2', teachingSessionId: 's2' })],
        comparableSessionIds: ['s1', 's2'],
      }),
    ).toBe(true)
  })

  it('reports whether observed sessions have supporting evidence without inventing a score', () => {
    expect(deriveEvidenceCoverage({ observations: [observation()], evidence: [] })).toBe('NONE')
    expect(deriveEvidenceCoverage({ observations: [observation()], evidence: [evidence()] })).toBe(
      'PRESENT',
    )
    expect(
      deriveEvidenceCoverage({
        observations: [observation(), observation({ id: 'o2', teachingSessionId: 's2' })],
        evidence: [evidence()],
      }),
    ).toBe('PARTIAL')
  })

  it('requires an explicit human decision before a teaching proposal can be applied', () => {
    expect(canApplyTeachingProposal(proposal())).toBe(false)
    expect(canApplyTeachingProposal(proposal({ status: 'DISMISSED' }))).toBe(false)
    expect(canApplyTeachingProposal(proposal({ status: 'ACCEPTED' }))).toBe(true)
    expect(canApplyTeachingProposal(proposal({ status: 'MODIFIED' }))).toBe(true)
  })
})
