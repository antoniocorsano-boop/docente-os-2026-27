import assert from 'node:assert/strict'
import test from 'node:test'
import type { TimetableImportCandidate } from './timetable-import-candidate'
import { projectTimetableImportPreview } from './timetable-import-preview-v2'

const DIGEST = 'a'.repeat(64)

function readyCandidate(): TimetableImportCandidate {
  return {
    contractVersion: 'TTIC-1',
    candidateId: 'candidate-1',
    state: 'PREVIEW_READY',
    reasonCode: 'READY',
    provenance: {
      sourceFingerprint: { algorithm: 'SHA-256', digest: DIGEST },
      sourceKind: 'OFFICIAL_DOCUMENT',
      sourceLabel: 'orario provvisorio.pdf',
      effectiveFrom: '2026-09-28',
    },
    slots: [{
      day: 1,
      sourcePosition: '1',
      classLabel: '2 A',
      sourceTeacherLabel: 'Rossi',
      resolvedAssignmentId: 'assignment-1',
      teacherResolutionState: 'RESOLVED',
      teacherResolutionReason: 'UNIQUE_EVIDENCE_MATCH',
    }],
  }
}

test('G1.6-D projects a PREVIEW_READY candidate without adding runtime semantics', () => {
  const result = projectTimetableImportPreview(readyCandidate())

  assert.equal(result.contractVersion, 'TTIP-1')
  assert.equal(result.isPreviewComplete, true)
  assert.equal(result.candidateId, 'candidate-1')
  assert.equal(result.provenance?.effectiveFrom, '2026-09-28')
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].resolvedAssignmentId, 'assignment-1')
  assert.equal(result.rows[0].requiresReview, false)
  assert.equal('effectiveTo' in result, false)
})

test('G1.6-D keeps an identifiable REVIEW_REQUIRED candidate blocked', () => {
  const candidate: TimetableImportCandidate = {
    ...readyCandidate(),
    state: 'REVIEW_REQUIRED',
    reasonCode: 'TEACHER_REVIEW_REQUIRED',
    slots: [{
      ...readyCandidate().slots[0],
      resolvedAssignmentId: undefined,
      teacherResolutionState: 'REVIEW_REQUIRED',
      teacherResolutionReason: 'INSUFFICIENT_EVIDENCE',
    }],
  }

  const result = projectTimetableImportPreview(candidate)
  assert.equal(result.candidateId, 'candidate-1')
  assert.equal(result.isPreviewComplete, false)
  assert.equal(result.rows[0].requiresReview, true)
  assert.equal(result.rows[0].teacherResolutionReason, 'INSUFFICIENT_EVIDENCE')
})

test('G1.6-D never enables continuation for a non-identifiable candidate', () => {
  const candidate: TimetableImportCandidate = {
    ...readyCandidate(),
    candidateId: null,
    state: 'REVIEW_REQUIRED',
    reasonCode: 'INVALID_SLOT',
    provenance: readyCandidate().provenance,
    slots: [],
  }

  const result = projectTimetableImportPreview(candidate)
  assert.equal(result.candidateId, null)
  assert.equal(result.isPreviewComplete, false)
})

test('G1.6-D never fabricates missing provenance', () => {
  const candidate: TimetableImportCandidate = {
    ...readyCandidate(),
    candidateId: null,
    state: 'REVIEW_REQUIRED',
    reasonCode: 'INVALID_SOURCE_PROVENANCE',
    provenance: null,
    slots: [],
  }

  const result = projectTimetableImportPreview(candidate)
  assert.equal(result.provenance, null)
  assert.equal(result.isPreviewComplete, false)
})

test('G1.6-D preserves source teacher evidence separately from resolved assignment', () => {
  const result = projectTimetableImportPreview(readyCandidate())
  assert.equal(result.rows[0].sourceTeacherLabel, 'Rossi')
  assert.equal(result.rows[0].resolvedAssignmentId, 'assignment-1')
})

test('G1.6-D does not mutate candidate or nested provenance', () => {
  const candidate = readyCandidate()
  const snapshot = JSON.stringify(candidate)
  const result = projectTimetableImportPreview(candidate)

  assert.equal(JSON.stringify(candidate), snapshot)
  assert.notEqual(result.provenance, candidate.provenance)
  assert.notEqual(result.provenance?.sourceFingerprint, candidate.provenance?.sourceFingerprint)
})

test('G1.6-D preserves canonical row order supplied by G1.6-C', () => {
  const candidate: TimetableImportCandidate = {
    ...readyCandidate(),
    slots: [
      { ...readyCandidate().slots[0], day: 1, sourcePosition: '2' },
      { ...readyCandidate().slots[0], day: 3, sourcePosition: '1' },
    ],
  }
  const result = projectTimetableImportPreview(candidate)
  assert.deepEqual(result.rows.map(row => [row.day, row.sourcePosition]), [[1, '2'], [3, '1']])
})

test('G1.6-D projection exposes no T/D/DIS or persistence operations', () => {
  const serialized = JSON.stringify(projectTimetableImportPreview(readyCandidate()))
  assert.equal(serialized.includes('DISPOSITION'), false)
  assert.equal(serialized.includes('DifferencePlan'), false)
  assert.equal(serialized.includes('AUTO_RESOLVED'), false)
  assert.equal(serialized.includes('canConfirmDraft'), false)
  assert.equal(serialized.includes('canProceed'), false)
  assert.equal(serialized.includes('canApply'), false)
  assert.equal(serialized.includes('canCreateDraft'), false)
})
