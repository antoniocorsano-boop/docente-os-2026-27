import assert from 'node:assert/strict'
import test from 'node:test'
import type { TimetableVersion } from './timetable'
import type { TimetableImportApplyReadiness } from './timetable-import-apply-readiness'
import {
  bindTimetableImportToDraftTarget,
  type TimetableDraftTargetContext,
  type TimetableDraftTargetSnapshot,
} from './timetable-import-draft-target-binding'

const READY: TimetableImportApplyReadiness = {
  contractVersion: 'TTAR-1',
  state: 'READY',
  candidateId: 'candidate-1',
  sourceFingerprint: 'a'.repeat(64),
  effectiveFrom: '2026-09-28',
  slots: [],
}

function version(status: TimetableVersion['status'] = 'DRAFT'): TimetableVersion {
  return {
    id: 'draft-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    label: 'Orario provvisorio dal 28-09-2026',
    status,
    effectiveFrom: '2026-09-28',
    effectiveTo: null,
    sourceKind: 'IMPORT',
    sourceRef: null,
    createdAt: '2026-09-28T00:00:00Z',
    updatedAt: '2026-09-28T00:00:00Z',
  }
}

function target(revisionToken = 'rev:version+slots:001'): TimetableDraftTargetSnapshot {
  return { version: version(), revisionToken }
}

function context(expectedRevisionToken = 'rev:version+slots:001'): TimetableDraftTargetContext {
  return {
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    expectedRevisionToken,
  }
}

test('G1.6-I binds READY import to one exact DRAFT snapshot', () => {
  assert.deepEqual(bindTimetableImportToDraftTarget(READY, target(), context()), {
    contractVersion: 'TTDT-1',
    state: 'BOUND',
    candidateId: 'candidate-1',
    sourceFingerprint: 'a'.repeat(64),
    targetVersionId: 'draft-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    effectiveFrom: '2026-09-28',
    expectedRevisionToken: 'rev:version+slots:001',
  })
})

test('G1.6-I blocks non-ready input and non-DRAFT target', () => {
  const blockedReadiness: TimetableImportApplyReadiness = {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'TIME_OVERLAP',
  }

  assert.deepEqual(bindTimetableImportToDraftTarget(blockedReadiness, target(), context()), {
    contractVersion: 'TTDT-1',
    state: 'BLOCKED',
    reason: 'READINESS_NOT_READY',
  })

  assert.deepEqual(
    bindTimetableImportToDraftTarget(READY, { ...target(), version: version('ACTIVE') }, context()),
    {
      contractVersion: 'TTDT-1',
      state: 'BLOCKED',
      reason: 'TARGET_NOT_DRAFT',
    },
  )
})

test('G1.6-I blocks workspace/year and effective-from mismatches', () => {
  assert.deepEqual(
    bindTimetableImportToDraftTarget(READY, target(), { ...context(), workspaceId: 'other' }),
    {
      contractVersion: 'TTDT-1',
      state: 'BLOCKED',
      reason: 'TARGET_CONTEXT_MISMATCH',
    },
  )

  assert.deepEqual(
    bindTimetableImportToDraftTarget(
      READY,
      { ...target(), version: { ...version(), effectiveFrom: '2026-09-29' } },
      context(),
    ),
    {
      contractVersion: 'TTDT-1',
      state: 'BLOCKED',
      reason: 'EFFECTIVE_FROM_MISMATCH',
    },
  )
})

test('G1.6-I requires an aggregate DRAFT revision token and exact optimistic-concurrency match', () => {
  assert.deepEqual(bindTimetableImportToDraftTarget(READY, target(''), context('')), {
    contractVersion: 'TTDT-1',
    state: 'BLOCKED',
    reason: 'DRAFT_REVISION_REQUIRED',
  })

  assert.deepEqual(bindTimetableImportToDraftTarget(READY, target('rev:new'), context('rev:old')), {
    contractVersion: 'TTDT-1',
    state: 'BLOCKED',
    reason: 'DRAFT_REVISION_MISMATCH',
  })
})

test('G1.6-I rejects invalid target context', () => {
  assert.deepEqual(
    bindTimetableImportToDraftTarget(READY, target(), { ...context(), academicYearId: '   ' }),
    {
      contractVersion: 'TTDT-1',
      state: 'BLOCKED',
      reason: 'INVALID_TARGET_CONTEXT',
    },
  )
})

test('G1.6-I is pure and exposes no apply or activation capability', () => {
  const readiness = structuredClone(READY)
  const draft = target()
  const ctx = context()
  const before = JSON.stringify({ readiness, draft, ctx })
  const result = bindTimetableImportToDraftTarget(readiness, draft, ctx)
  assert.equal(JSON.stringify({ readiness, draft, ctx }), before)

  const serialized = JSON.stringify(result)
  for (const forbidden of [
    'canApply',
    'apply_timetable_import_to_draft',
    'activate_timetable_version',
    'ACTIVE',
    'ARCHIVED',
  ]) {
    assert.equal(serialized.includes(forbidden), false)
  }
})
