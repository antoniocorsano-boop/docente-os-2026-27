import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  projectProvisionalTechnologyReference,
  provisionalTechnologyGradeRef,
  type ProvisionalTechnologyGrade,
} from './cml-provisional-technology-reference'

function fixture(grade: ProvisionalTechnologyGrade) {
  const gradeRef = provisionalTechnologyGradeRef(grade)
  const gradeNumber = gradeRef.slice(-1)
  const segmentId = 'arena-tecnologia-' + gradeNumber
  return {
    institutionId: 'ics-lorenzo-milani',
    schoolYearRef: '2026/2027',
    schoolOrder: 'secondaria',
    gradeRef,
    disciplineRef: 'technology',
    version: { id: 'can-curr-master-00-v1-3', versionNumber: '1.3' },
    provenance: {
      sourceProduct: 'CURMANLIGHT_ARENA',
      sourceContract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
      issuedAt: '2026-11-04T00:00:00.000Z',
    },
    authority: {
      state: 'PROVISIONAL_COMPLETE',
      alignmentAuthority: 'PROVISIONAL_BASELINE',
      requiresRevalidationOnApproval: true,
    },
    downstreamPolicy: { acceptanceRequired: true, automaticWriteAllowed: false },
    structuralFootprint: {
      algorithm: 'fnv1a', version: 1, hash: '8588371c', computedAt: '2026-11-04T00:00:00.000Z',
    },
    segment: {
      id: segmentId,
      subjectOrFieldId: 'tecnologia',
      scope: { type: 'grade', grade: gradeNumber },
      frameworkApplicability: {
        framework: gradeRef === 'grade-1' ? 'IN2025' : 'IN2012',
        resolutionStatus: 'resolved',
      },
      content: { obiettivi: ['Obiettivo documentale'], conoscenze: ['Conoscenza'], evidenze: ['Elaborato atteso'] },
    },
    nodes: [{ id: 'node-' + gradeNumber, segmentId }],
  }
}

describe('provisional Arena reference for a teaching class', () => {
  for (const grade of ['PRIMA', 'SECONDA', 'TERZA'] as const) {
    it('projects the correct year-specific reference, always non-vigente and read-only: ' + grade, () => {
      const result = projectProvisionalTechnologyReference({
        selected: fixture(grade), grade, schoolYearRef: '2026-2027',
      })
      assert.equal(result.gradeRef, provisionalTechnologyGradeRef(grade))
      assert.equal(result.framework, grade === 'PRIMA' ? 'IN2025' : 'IN2012')
      assert.equal(result.status, 'PROVISIONAL_NOT_IN_FORCE')
      assert.equal(result.institutionIdentityVerified, false)
      assert.equal(result.writeAllowed, false)
      assert.equal(result.legacyReplacementAllowed, false)
      assert.equal(result.obiettivi[0], 'Obiettivo documentale')
      assert.equal(result.nodeCount, 1)
    })
  }

  it('rejects a grade mismatch instead of returning another class reference', () => {
    assert.throws(() => projectProvisionalTechnologyReference({
      selected: fixture('SECONDA'), grade: 'PRIMA', schoolYearRef: '2026/2027',
    }), /does not match/)
  })

  it('rejects wrong academic year and unresolved or wrong transitional regime', () => {
    const selected = fixture('TERZA')
    assert.throws(() => projectProvisionalTechnologyReference({
      selected, grade: 'TERZA', schoolYearRef: '2027/2028',
    }), /school year/)
    selected.segment.frameworkApplicability.framework = 'IN2025'
    assert.throws(() => projectProvisionalTechnologyReference({
      selected, grade: 'TERZA', schoolYearRef: '2026/2027',
    }), /transitional regime/)
  })

  it('fails closed if an authority is elevated or automatic writes are enabled', () => {
    const selected = fixture('PRIMA')
    selected.authority.state = 'APPROVED' as 'PROVISIONAL_COMPLETE'
    assert.throws(() => projectProvisionalTechnologyReference({
      selected, grade: 'PRIMA', schoolYearRef: '2026/2027',
    }), /provisional/)
    selected.authority.state = 'PROVISIONAL_COMPLETE'
    selected.downstreamPolicy.automaticWriteAllowed = true
    assert.throws(() => projectProvisionalTechnologyReference({
      selected, grade: 'PRIMA', schoolYearRef: '2026/2027',
    }), /automatic writes/)
  })

  it('rejects missing or cross-segment evidence without inventing a curricolo', () => {
    const selected = fixture('SECONDA')
    selected.nodes[0].segmentId = 'other'
    assert.throws(() => projectProvisionalTechnologyReference({
      selected, grade: 'SECONDA', schoolYearRef: '2026/2027',
    }), /nodes/)
    selected.nodes[0].segmentId = selected.segment.id
    selected.segment.content.evidenze = []
    assert.throws(() => projectProvisionalTechnologyReference({
      selected, grade: 'SECONDA', schoolYearRef: '2026/2027',
    }), /Evidenze/)
  })
})
