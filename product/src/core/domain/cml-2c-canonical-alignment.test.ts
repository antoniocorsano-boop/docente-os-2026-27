import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPilot2CCanonicalAlignmentPreview, type Pilot2CLegacyBaseline } from './cml-2c-canonical-alignment'

const YEAR = '2026/2027'
const LEGACY: Pilot2CLegacyBaseline = {
  sourceHandoffFootprintHash: '7bb48175',
  alignmentAuthority: 'PROVISIONAL_BASELINE',
  acceptedAt: '2026-09-21T08:37:23.959195Z',
  requirements: [{
    requirementId: 'older-technology-requirement',
    description: 'Analizzare sistemi e processi produttivi; documentare i risultati della progettazione.',
  }],
}

function grade2Slice() {
  return {
    institutionId: 'ics-lorenzo-milani',
    schoolYearRef: YEAR,
    schoolOrder: 'secondaria',
    gradeRef: 'grade-2',
    disciplineRef: 'technology',
    version: { id: 'can-curr-master-00-v1-3', versionNumber: '1.3' },
    structuralFootprint: { algorithm: 'fnv1a', version: 1, hash: '8588371c', computedAt: '2026-11-03T20:00:00Z' },
    provenance: { sourceProduct: 'CURMANLIGHT_ARENA', sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1', issuedAt: '2026-11-03T20:00:00Z' },
    authority: { state: 'PROVISIONAL_COMPLETE', alignmentAuthority: 'PROVISIONAL_BASELINE', requiresRevalidationOnApproval: true },
    downstreamPolicy: { acceptanceRequired: true, automaticWriteAllowed: false },
    segment: {
      id: 'can-curr-master-00-secondaria-tecnologia-2',
      subjectOrFieldId: 'tecnologia',
      scope: { type: 'grade', grade: '2' },
      frameworkApplicability: { framework: 'IN2012', resolutionStatus: 'resolved' },
      content: {
        obiettivi: ['leggere processi produttivi; interpretare elementi di territorio/abitare; organizzare informazioni'],
        conoscenze: ['materiali/filiere; abitare/territorio; processi; dati; sicurezza/sostenibilità'],
        evidenze: ['elaborato tecnico; analisi comparativa; schema di filiera/processo; proposta motivata'],
        competenze: ['analizzare materiali e processi; leggere sistemi dell’abitare/territorio'],
      },
    },
    nodes: [{
      id: 'can-curr-master-00-secondaria-tecnologia-2-objective-1',
      segmentId: 'can-curr-master-00-secondaria-tecnologia-2',
      type: 'objective',
      title: 'leggere processi produttivi; interpretare elementi di territorio/abitare; organizzare informazioni',
    }],
  }
}

function preview(overrides: Record<string, unknown> = {}) {
  return buildPilot2CCanonicalAlignmentPreview({
    selected: grade2Slice(),
    section: { grade: 'SECONDA', sectionCode: 'C', schoolYearRef: YEAR },
    legacyBaseline: LEGACY,
    ...overrides,
  })
}

test('2C receives the canonical Technology II source for comparison, while historical planning remains unchanged', () => {
  const before = structuredClone(LEGACY)
  const snapshot = grade2Slice()
  const snapshotBefore = structuredClone(snapshot)
  const result = preview({ selected: snapshot })
  assert.equal(result.status, 'PROFESSIONAL_REVIEW_REQUIRED')
  assert.equal(result.section, '2C')
  assert.equal(result.scope.gradeRef, 'grade-2')
  assert.equal(result.scope.framework, 'IN2012')
  assert.equal(result.provenance.releaseStructuralFootprint, '8588371c')
  assert.equal(result.provenance.institutionIdentityVerified, false)
  assert.equal(result.provenance.curricoloVigente, false)
  assert.equal(result.legacy?.sourceHandoffFootprintHash, '7bb48175')
  assert.equal(result.legacy?.acceptedAt, '2026-09-21T08:37:23.959195Z')
  assert.deepEqual(result.legacy?.requirements.map(r => r.review), ['TO_REVIEW'])
  assert.ok(result.canonical.obiettivi[0].includes('processi produttivi'))
  assert.ok(result.canonical.conoscenze[0].includes('filiere'))
  assert.ok(result.canonical.evidenze[0].includes('schema di filiera'))
  assert.equal(result.authorization.writeAllowed, false)
  assert.equal(result.authorization.replacementAllowed, false)
  assert.equal(result.authorization.teacherDecisionRecorded, false)
  assert.equal(result.authorization.historicalPreparationPreserved, true)
  assert.deepEqual(LEGACY, before)
  assert.deepEqual(snapshot, snapshotBefore)
})

test('comparison does not invent acceptance or semantic equivalence when historic baseline is missing', () => {
  const result = preview({ legacyBaseline: null })
  assert.equal(result.status, 'HISTORICAL_BASELINE_NOT_FOUND')
  assert.equal(result.legacy, null)
  assert.equal(result.authorization.writeAllowed, false)
  assert.equal(result.authorization.teacherDecisionRecorded, false)
  assert.equal(result.proposal.status, 'TO_BE_ASSESSED_BY_TEACHER')
  assert.ok(result.proposal.text.includes('filier'))
})

test('a previously approved historical baseline cannot be silently downgraded or replaced', () => {
  const result = preview({ legacyBaseline: { ...LEGACY, alignmentAuthority: 'APPROVED_INSTITUTIONAL' } })
  assert.equal(result.legacy?.alignmentAuthority, 'APPROVED_INSTITUTIONAL')
  assert.equal(result.status, 'PROFESSIONAL_REVIEW_REQUIRED')
  assert.equal(result.authorization.replacementAllowed, false)
  assert.equal(result.authorization.writeAllowed, false)
})

test('fails closed on other sections, years, grades and framework applicability', () => {
  assert.throws(() => preview({ section: { grade: 'SECONDA', sectionCode: 'A', schoolYearRef: YEAR } }), /2C|section/i)
  assert.throws(() => preview({ section: { grade: 'TERZA', sectionCode: 'C', schoolYearRef: YEAR } }), /2C|grade/i)
  assert.throws(() => preview({ section: { grade: 'SECONDA', sectionCode: 'C', schoolYearRef: '2027/2028' } }), /year/i)
  assert.throws(() => preview({ selected: { ...grade2Slice(), gradeRef: 'grade-3' } }), /grade|class/i)
  assert.throws(() => preview({ selected: { ...grade2Slice(), authority: { state: 'APPROVED_INSTITUTIONAL' } } }), /authority|provisional/i)
  assert.throws(() => preview({ selected: { ...grade2Slice(), segment: { ...grade2Slice().segment, frameworkApplicability: { framework: 'IN2025', resolutionStatus: 'resolved' } } } }), /IN2012|framework/i)
  assert.throws(() => preview({ selected: { ...grade2Slice(), downstreamPolicy: { automaticWriteAllowed: true } } }), /write|policy/i)
})

test('rejects unverified empty historical identifiers and malformed canonical content', () => {
  assert.throws(() => preview({ legacyBaseline: { ...LEGACY, sourceHandoffFootprintHash: '' } }), /footprint/i)
  assert.throws(() => preview({ selected: { ...grade2Slice(), segment: { ...grade2Slice().segment, content: { obiettivi: [], conoscenze: [], evidenze: [] } } } }), /objective|obiettivi|content/i)
})
