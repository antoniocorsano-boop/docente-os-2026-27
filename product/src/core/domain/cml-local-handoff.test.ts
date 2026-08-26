import { describe, expect, it } from 'vitest'
import {
  buildAnnualPlanImportPreview,
  computeCmlLocalHandoffFootprint,
  parseCmlLocalHandoffJson,
  validateCmlLocalHandoff,
  type CmlLocalHandoffV1,
} from './cml-local-handoff'

function ref(entityType: string, entityId: string, versionId?: string) {
  return { namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}) }
}

function fixture(): CmlLocalHandoffV1 {
  const base = {
    contract: 'CML_LOCAL_HANDOFF_V1' as const,
    targetProduct: 'DOCENTE_OS' as const,
    acceptanceRequired: true as const,
    importMode: 'PREVIEW_ONLY' as const,
    createdAt: '2026-08-26T12:15:00.000Z',
    curriculumAdopted: {
      contract: 'CML_INTEROP_V1' as const,
      messageId: 'msg-curriculum-001',
      messageType: 'CURRICULUM_ADOPTED' as const,
      sourceProduct: 'CURMANLIGHT_ARENA' as const,
      sourceVersion: 'arena-v1',
      emittedAt: '2026-08-26T12:00:00.000Z',
      payloadVersion: 1 as const,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL' as const,
      provenance: { sourceRefs: [ref('CurriculumVersion', 'technology-grade-1', '2026-27')], generatedBy: 'HUMAN' as const, humanConfirmed: true },
      payload: {
        schoolYearRef: '2026-2027',
        disciplineRef: 'technology',
        gradeRef: 'grade-1',
        curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
      },
    },
    annualPlanningFramework: {
      contract: 'CML_INTEROP_V1' as const,
      messageId: 'msg-framework-001',
      messageType: 'ANNUAL_PLANNING_FRAMEWORK_AVAILABLE' as const,
      sourceProduct: 'CURMANLIGHT_ARENA' as const,
      sourceVersion: 'arena-v1',
      emittedAt: '2026-08-26T12:00:00.000Z',
      payloadVersion: 1 as const,
      privacyClass: 'PROFESSIONAL_NON_PERSONAL' as const,
      provenance: { sourceRefs: [ref('CurriculumVersion', 'technology-grade-1', '2026-27')], generatedBy: 'SYSTEM_DERIVED' as const, humanConfirmed: true },
      payload: {
        disciplineRef: 'technology',
        gradeRef: 'grade-1',
        curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
        periods: [
          { periodId: 'p1', label: 'Primo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-001')] },
          { periodId: 'p2', label: 'Secondo periodo', suggestedNodeRefs: [ref('CurriculumNode', 'node-002')] },
        ],
        constraints: [{ id: 'c1', kind: 'REQUIRED' as const, description: 'Preservare allineamento curricolare.' }],
      },
    },
  }
  return {
    ...base,
    structuralFootprint: { algorithm: 'fnv1a', version: 1, hash: computeCmlLocalHandoffFootprint(base) },
  }
}

describe('CML local handoff preview consumer', () => {
  it('accepts a coherent Arena handoff', () => {
    expect(validateCmlLocalHandoff(fixture())).toEqual({ valid: true, errors: [] })
  })

  it('creates preview-only annual plan projection', () => {
    const preview = buildAnnualPlanImportPreview(fixture())
    expect(preview.status).toBe('READY_FOR_TEACHER_REVIEW')
    expect(preview.persistenceAllowed).toBe(false)
    expect(preview.acceptanceRequired).toBe(true)
    expect(preview.periods).toHaveLength(2)
    expect(preview.context.schoolYearRef).toBe('2026-2027')
  })

  it('rejects an attempt to bypass teacher acceptance', () => {
    const handoff = fixture() as unknown as Record<string, unknown>
    handoff.acceptanceRequired = false
    expect(validateCmlLocalHandoff(handoff).valid).toBe(false)
  })

  it('rejects import modes other than preview only', () => {
    const handoff = fixture() as unknown as Record<string, unknown>
    handoff.importMode = 'APPLY'
    expect(validateCmlLocalHandoff(handoff).errors).toContain('importMode must remain PREVIEW_ONLY')
  })

  it('rejects curriculum/framework mismatches', () => {
    const handoff = fixture()
    ;(handoff.annualPlanningFramework.payload as Record<string, unknown>).gradeRef = 'grade-2'
    handoff.structuralFootprint.hash = computeCmlLocalHandoffFootprint(handoff)
    expect(validateCmlLocalHandoff(handoff).errors).toContain('gradeRef mismatch')
  })

  it('rejects tampering when the structural footprint is stale', () => {
    const handoff = fixture()
    ;(handoff.annualPlanningFramework.payload as Record<string, unknown>).disciplineRef = 'mathematics'
    expect(validateCmlLocalHandoff(handoff).errors).toContain('structural footprint mismatch')
  })

  it('round-trips through JSON parsing without persistence', () => {
    const preview = buildAnnualPlanImportPreview(parseCmlLocalHandoffJson(JSON.stringify(fixture())))
    expect(preview.persistenceAllowed).toBe(false)
    expect(preview.source.contract).toBe('CML_LOCAL_HANDOFF_V1')
  })
})
