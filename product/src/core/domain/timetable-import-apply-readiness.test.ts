import assert from 'node:assert/strict'
import test from 'node:test'
import type { TimetableImportCandidate } from './timetable-import-candidate'
import type { TimetableImportHumanDecisionReceipt } from './timetable-import-human-decision'
import {
  buildTimetableImportApplyReadiness,
  type TimetableImportTimeBinding,
} from './timetable-import-apply-readiness'

const DIGEST = 'a'.repeat(64)

function candidate(): TimetableImportCandidate {
  return {
    contractVersion: 'TTIC-1',
    candidateId: 'candidate-1',
    state: 'PREVIEW_READY',
    reasonCode: 'READY',
    provenance: {
      sourceFingerprint: { algorithm: 'SHA-256', digest: DIGEST },
      sourceKind: 'OFFICIAL_DOCUMENT',
      sourceLabel: 'orario.pdf',
      effectiveFrom: '2026-09-28',
    },
    slots: [
      {
        day: 1,
        sourcePosition: '1',
        classLabel: '2A',
        sourceTeacherLabel: 'ROSSI MARIO',
        resolvedAssignmentId: 'assignment-a',
        teacherResolutionState: 'RESOLVED',
        teacherResolutionReason: 'UNIQUE_EVIDENCE_MATCH',
      },
      {
        day: 1,
        sourcePosition: '2',
        classLabel: '2C',
        sourceTeacherLabel: 'ROSSI MARIO',
        resolvedAssignmentId: 'assignment-c',
        teacherResolutionState: 'RESOLVED',
        teacherResolutionReason: 'UNIQUE_EVIDENCE_MATCH',
      },
    ],
  }
}

function receipt(decision: 'CONFIRM_PREVIEW' | 'REJECT_PREVIEW' = 'CONFIRM_PREVIEW'): TimetableImportHumanDecisionReceipt {
  return {
    contractVersion: 'TTID-1',
    candidateId: 'candidate-1',
    sourceFingerprint: DIGEST,
    previewContractVersion: 'TTIP-1',
    decision,
  }
}

function bindings(): TimetableImportTimeBinding[] {
  return [
    { day: 1, sourcePosition: '1', startTime: '08:00', endTime: '09:00', ordinal: 1 },
    { day: 1, sourcePosition: '2', startTime: '09:00', endTime: '10:00', ordinal: 2 },
  ]
}

test('G1.6-H produces deterministic READY projection only with exact explicit time coverage', () => {
  const result = buildTimetableImportApplyReadiness(candidate(), receipt(), bindings())
  assert.deepEqual(result, {
    contractVersion: 'TTAR-1',
    state: 'READY',
    candidateId: 'candidate-1',
    sourceFingerprint: DIGEST,
    effectiveFrom: '2026-09-28',
    slots: [
      {
        day: 1,
        sourcePosition: '1',
        classLabel: '2A',
        sourceTeacherLabel: 'ROSSI MARIO',
        resolvedAssignmentId: 'assignment-a',
        startTime: '08:00',
        endTime: '09:00',
        ordinal: 1,
      },
      {
        day: 1,
        sourcePosition: '2',
        classLabel: '2C',
        sourceTeacherLabel: 'ROSSI MARIO',
        resolvedAssignmentId: 'assignment-c',
        startTime: '09:00',
        endTime: '10:00',
        ordinal: 2,
      },
    ],
  })
})

test('G1.6-H blocks stale receipt and preview contract versions at runtime', () => {
  const staleReceipt = {
    ...receipt(),
    contractVersion: 'TTID-0',
  } as unknown as TimetableImportHumanDecisionReceipt
  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), staleReceipt, bindings()), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'RECEIPT_CONTRACT_MISMATCH',
  })

  const stalePreviewReceipt = {
    ...receipt(),
    previewContractVersion: 'TTIP-0',
  } as unknown as TimetableImportHumanDecisionReceipt
  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), stalePreviewReceipt, bindings()), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'PREVIEW_CONTRACT_MISMATCH',
  })
})

test('G1.6-H blocks REJECT decision', () => {
  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), receipt('REJECT_PREVIEW'), bindings()), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'DECISION_NOT_CONFIRMED',
  })
})

test('G1.6-H blocks stale candidate and fingerprint bindings', () => {
  assert.equal(
    buildTimetableImportApplyReadiness(candidate(), { ...receipt(), candidateId: 'stale' }, bindings()).state,
    'BLOCKED',
  )
  assert.deepEqual(
    buildTimetableImportApplyReadiness(candidate(), { ...receipt(), sourceFingerprint: 'b'.repeat(64) }, bindings()),
    { contractVersion: 'TTAR-1', state: 'BLOCKED', reason: 'SOURCE_FINGERPRINT_MISMATCH' },
  )
})

test('G1.6-H blocks candidate that is not authoritative READY', () => {
  const value = { ...candidate(), state: 'REVIEW_REQUIRED' as const, reasonCode: 'TEACHER_REVIEW_REQUIRED' as const }
  assert.deepEqual(buildTimetableImportApplyReadiness(value, receipt(), bindings()), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'CANDIDATE_NOT_READY',
  })
})

test('G1.6-H blocks unresolved assignment', () => {
  const value: TimetableImportCandidate = {
    ...candidate(),
    slots: [
      {
        ...candidate().slots[0],
        resolvedAssignmentId: undefined,
        teacherResolutionState: 'REVIEW_REQUIRED',
        teacherResolutionReason: 'NO_COMPATIBLE_ASSIGNMENT',
      },
    ],
  }
  assert.deepEqual(buildTimetableImportApplyReadiness(value, receipt(), [
    { day: 1, sourcePosition: '1', startTime: '08:00', endTime: '09:00' },
  ]), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'UNRESOLVED_ASSIGNMENT',
  })
})

test('G1.6-H blocks missing, extra and duplicate time bindings fail-closed', () => {
  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), receipt(), bindings().slice(0, 1)), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'MISSING_TIME_BINDING',
  })

  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), receipt(), [
    ...bindings(),
    { day: 2, sourcePosition: '1', startTime: '08:00', endTime: '09:00' },
  ]), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'EXTRA_TIME_BINDING',
  })

  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), receipt(), [
    ...bindings(),
    { day: 1, sourcePosition: '1', startTime: '10:00', endTime: '11:00' },
  ]), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'DUPLICATE_TIME_BINDING',
  })
})

test('G1.6-H blocks invalid times and overlaps', () => {
  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), receipt(), [
    { day: 1, sourcePosition: '1', startTime: '09:00', endTime: '08:00' },
    bindings()[1],
  ]), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'INVALID_TIME_BINDING',
  })

  assert.deepEqual(buildTimetableImportApplyReadiness(candidate(), receipt(), [
    { day: 1, sourcePosition: '1', startTime: '08:00', endTime: '09:30' },
    { day: 1, sourcePosition: '2', startTime: '09:00', endTime: '10:00' },
  ]), {
    contractVersion: 'TTAR-1',
    state: 'BLOCKED',
    reason: 'TIME_OVERLAP',
  })
})

test('G1.6-H leaves all inputs unchanged and exposes no runtime mutation capability', () => {
  const c = candidate()
  const r = receipt()
  const b = bindings()
  const snapshot = JSON.stringify({ c, r, b })
  const result = buildTimetableImportApplyReadiness(c, r, b)
  assert.equal(JSON.stringify({ c, r, b }), snapshot)

  const serialized = JSON.stringify(result)
  for (const forbidden of [
    'workspaceId',
    'academicYearId',
    'timetableVersionId',
    'canApply',
    'activate_timetable_version',
    'apply_timetable_import_to_draft',
    'DISPOSITION',
  ]) {
    assert.equal(serialized.includes(forbidden), false)
  }
})
