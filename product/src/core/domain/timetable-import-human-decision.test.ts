import assert from 'node:assert/strict'
import test from 'node:test'
import type { TimetableImportPreviewModel } from './timetable-import-preview-v2'
import { buildTimetableImportHumanDecision } from './timetable-import-human-decision'

const DIGEST = 'a'.repeat(64)

function completePreview(): TimetableImportPreviewModel {
  return {
    contractVersion: 'TTIP-1',
    candidateId: 'candidate-1',
    state: 'PREVIEW_READY',
    reasonCode: 'READY',
    provenance: {
      sourceFingerprint: { algorithm: 'SHA-256', digest: DIGEST },
      sourceKind: 'OFFICIAL_DOCUMENT',
      sourceLabel: 'orario.pdf',
      effectiveFrom: '2026-09-28',
    },
    isPreviewComplete: true,
    rows: [],
  }
}

function request(decision: 'CONFIRM_PREVIEW' | 'REJECT_PREVIEW' = 'CONFIRM_PREVIEW') {
  return {
    candidateId: 'candidate-1',
    sourceFingerprint: DIGEST,
    previewContractVersion: 'TTIP-1' as const,
    decision,
  }
}

test('G1.6-E records CONFIRM only for the exact complete preview binding', () => {
  const result = buildTimetableImportHumanDecision(completePreview(), request())
  assert.equal(result.state, 'RECORDED')
  if (result.state !== 'RECORDED') return
  assert.deepEqual(result.receipt, {
    contractVersion: 'TTID-1',
    candidateId: 'candidate-1',
    sourceFingerprint: DIGEST,
    previewContractVersion: 'TTIP-1',
    decision: 'CONFIRM_PREVIEW',
  })
})

test('G1.6-E records REJECT without mutating or deleting the candidate', () => {
  const preview = completePreview()
  const snapshot = JSON.stringify(preview)
  const result = buildTimetableImportHumanDecision(preview, request('REJECT_PREVIEW'))
  assert.equal(result.state, 'RECORDED')
  if (result.state !== 'RECORDED') return
  assert.equal(result.receipt.decision, 'REJECT_PREVIEW')
  assert.equal(JSON.stringify(preview), snapshot)
})

test('G1.6-E rejects an incomplete or review-required preview', () => {
  const preview: TimetableImportPreviewModel = {
    ...completePreview(),
    state: 'REVIEW_REQUIRED',
    reasonCode: 'TEACHER_REVIEW_REQUIRED',
    isPreviewComplete: false,
  }
  assert.deepEqual(buildTimetableImportHumanDecision(preview, request()), {
    state: 'DECISION_REJECTED',
    reason: 'PREVIEW_NOT_COMPLETE',
  })
})

test('G1.6-E rejects candidateId mismatch fail-closed', () => {
  assert.deepEqual(
    buildTimetableImportHumanDecision(completePreview(), { ...request(), candidateId: 'stale-candidate' }),
    { state: 'DECISION_REJECTED', reason: 'CANDIDATE_ID_MISMATCH' },
  )
})

test('G1.6-E rejects source fingerprint mismatch fail-closed', () => {
  assert.deepEqual(
    buildTimetableImportHumanDecision(completePreview(), { ...request(), sourceFingerprint: 'b'.repeat(64) }),
    { state: 'DECISION_REJECTED', reason: 'SOURCE_FINGERPRINT_MISMATCH' },
  )
})

test('G1.6-E rejects preview contract mismatch fail-closed', () => {
  const staleRequest = { ...request(), previewContractVersion: 'TTIP-0' as 'TTIP-1' }
  assert.deepEqual(buildTimetableImportHumanDecision(completePreview(), staleRequest), {
    state: 'DECISION_REJECTED',
    reason: 'PREVIEW_CONTRACT_MISMATCH',
  })
})

test('G1.6-E rejects null candidate identity and missing provenance', () => {
  const noIdentity: TimetableImportPreviewModel = {
    ...completePreview(),
    candidateId: null,
    isPreviewComplete: false,
  }
  const noProvenance: TimetableImportPreviewModel = {
    ...completePreview(),
    provenance: null,
    isPreviewComplete: false,
  }
  assert.equal(buildTimetableImportHumanDecision(noIdentity, request()).state, 'DECISION_REJECTED')
  assert.equal(buildTimetableImportHumanDecision(noProvenance, request()).state, 'DECISION_REJECTED')
})

test('G1.6-E does not expose runtime application capabilities', () => {
  const result = buildTimetableImportHumanDecision(completePreview(), request())
  const serialized = JSON.stringify(result)
  for (const forbidden of ['canApply', 'canCreateDraft', 'expectedDraft', 'DifferencePlan', 'AUTO_RESOLVED', 'DISPOSITION']) {
    assert.equal(serialized.includes(forbidden), false)
  }
})
