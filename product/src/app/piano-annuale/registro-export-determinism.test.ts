import assert from 'node:assert/strict'
import test from 'node:test'
import type { AnnualPlanExecutionSnapshot } from '@/core/domain/annual-plan-execution'
import type { CanonicalPlanRuntimeSources } from './model'
import { buildRegistroTeachingProjectionFromAnnualPlan } from './registro-export-model'

const COMMIT = 'abcdef0123456789abcdef0123456789abcdef01'

const runtimeSources: CanonicalPlanRuntimeSources = {
  Prima: { code: 'CAN-PLAN-1', assetId: 'plan-asset-1', generationId: 'plan-generation-1' },
  Seconda: null,
  Terza: null,
}

function section(id: string, sectionCode: string): AnnualPlanExecutionSnapshot['sections'][number] {
  return {
    id,
    workspaceId: 'workspace-private',
    academicYearId: 'academic-year-private',
    grade: 'PRIMA',
    sectionCode,
    status: 'CONFERMATA',
    sourceNote: null,
    confirmedAt: '2026-09-01T08:00:00.000Z',
    createdAt: '2026-09-01T07:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  }
}

function project(sections: AnnualPlanExecutionSnapshot['sections']) {
  return buildRegistroTeachingProjectionFromAnnualPlan({
    snapshot: { sections, progress: [] },
    runtimeSources,
    schoolYear: '2026/2027',
    disciplineName: 'Tecnologia',
    generatedAt: '2026-10-30T08:00:00.000Z',
    provenance: { sourceCommit: COMMIT, sourceBranch: 'develop' },
  })
}

test('export ordering and fingerprint are deterministic when the source snapshot order changes', () => {
  const first = project([section('section-1c', 'C'), section('section-1a', 'A')])
  const second = project([section('section-1a', 'A'), section('section-1c', 'C')])

  assert.deepEqual(
    first.classes.map((item) => item.sourceSectionId),
    ['section-1a', 'section-1c'],
  )
  assert.deepEqual(first.classes, second.classes)
  assert.equal(first.projectionFingerprint.hash, second.projectionFingerprint.hash)
})
