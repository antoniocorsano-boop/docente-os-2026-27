import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnnualPlanExecutionSnapshot } from '@/core/domain/annual-plan-execution'
import type { CanonicalPlanRuntimeSources } from './model'
import { buildRegistroTeachingProjectionFromAnnualPlan } from './registro-export-model'

const COMMIT = 'abcdef0123456789abcdef0123456789abcdef01'

function snapshot(): AnnualPlanExecutionSnapshot {
  return {
    sections: [
      {
        id: 'section-1a',
        workspaceId: 'workspace-secret',
        academicYearId: 'academic-year-secret',
        grade: 'PRIMA',
        sectionCode: 'A',
        status: 'CONFERMATA',
        sourceNote: 'Orario docente',
        confirmedAt: '2026-09-01T08:00:00.000Z',
        createdAt: '2026-09-01T07:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
      {
        id: 'section-1c',
        workspaceId: 'workspace-secret',
        academicYearId: 'academic-year-secret',
        grade: 'PRIMA',
        sectionCode: 'C',
        status: 'DA_CONFERMARE',
        sourceNote: null,
        confirmedAt: null,
        createdAt: '2026-09-01T07:00:00.000Z',
        updatedAt: '2026-09-01T07:00:00.000Z',
      },
    ],
    progress: [
      {
        id: 'progress-private',
        sectionId: 'section-1a',
        canonicalPlanAssetId: 'plan-asset-1',
        canonicalGenerationId: 'plan-generation-1',
        blockId: 'B03',
        status: 'SVOLTO',
        executedOn: '2026-09-30',
        evidenceNote: 'Nota professionale che non deve uscire',
        updatedAt: '2026-09-30T10:00:00.000Z',
      },
    ],
  }
}

function runtimeSources(): CanonicalPlanRuntimeSources {
  return {
    Prima: { code: 'CAN-PLAN-1', assetId: 'plan-asset-1', generationId: 'plan-generation-1' },
    Seconda: null,
    Terza: null,
  }
}

test('projects real annual-plan section identities and canonical UDA metadata without execution evidence', () => {
  const projection = buildRegistroTeachingProjectionFromAnnualPlan({
    snapshot: snapshot(),
    runtimeSources: runtimeSources(),
    schoolYear: '2026/2027',
    disciplineName: 'Tecnologia',
    generatedAt: '2026-10-30T06:00:00.000Z',
    provenance: { sourceCommit: COMMIT, sourceBranch: 'develop' },
  })

  assert.equal(projection.classes.length, 2)
  assert.deepEqual(
    projection.classes.map((item) => [item.sourceSectionId, item.compactLabel, item.displayLabel, item.sectionStatus]),
    [
      ['section-1a', '1A', '1ª A', 'CONFERMATA'],
      ['section-1c', '1C', '1ª C', 'DA_CONFERMARE'],
    ],
  )

  const uda101 = projection.classes[0]!.udas.find((uda) => uda.sourceUdaRef === '1-01')
  assert.ok(uda101)
  assert.equal(uda101.title, 'Tecnologia, bisogni, risorse e sistemi')
  assert.equal(uda101.plannedHours, 8)
  assert.equal(uda101.period, 'Settembre/Ottobre')
  assert.deepEqual(uda101.packRefs, ['CAN-PACK-1A'])
  assert.equal(uda101.canonicalGenerationId, 'plan-generation-1')

  const serialized = JSON.stringify(projection)
  for (const forbidden of ['workspace-secret', 'academic-year-secret', 'progress-private', 'executedOn', 'evidenceNote', 'Nota professionale']) {
    assert.equal(serialized.includes(forbidden), false, forbidden)
  }
})

test('fails closed when a section has no resolved canonical plan source', () => {
  const state = snapshot()
  state.sections = [{ ...state.sections[0]!, grade: 'SECONDA' }]
  assert.throws(
    () => buildRegistroTeachingProjectionFromAnnualPlan({
      snapshot: state,
      runtimeSources: runtimeSources(),
      schoolYear: '2026/2027',
      disciplineName: 'Tecnologia',
      generatedAt: '2026-10-30T06:00:00.000Z',
      provenance: { sourceCommit: COMMIT, sourceBranch: 'develop' },
    }),
    /MISSING_CANONICAL_PLAN_SOURCE:Seconda/,
  )
})

test('requires exact commit provenance instead of inventing a local or unknown source', () => {
  assert.throws(
    () => buildRegistroTeachingProjectionFromAnnualPlan({
      snapshot: snapshot(),
      runtimeSources: runtimeSources(),
      schoolYear: '2026/2027',
      disciplineName: 'Tecnologia',
      generatedAt: '2026-10-30T06:00:00.000Z',
      provenance: { sourceCommit: 'unknown', sourceBranch: 'develop' },
    }),
    /INVALID_SOURCE_COMMIT/,
  )
})
