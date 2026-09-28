import type { TimetableImportPreviewModel } from './timetable-import-preview-v2'

export const TIMETABLE_IMPORT_HUMAN_DECISION_VERSION = 'TTID-1' as const

export type TimetableImportHumanDecision = 'CONFIRM_PREVIEW' | 'REJECT_PREVIEW'

export type TimetableImportHumanDecisionRequest = Readonly<{
  candidateId: string
  sourceFingerprint: string
  previewContractVersion: TimetableImportPreviewModel['contractVersion']
  decision: TimetableImportHumanDecision
}>

export type TimetableImportHumanDecisionReceipt = Readonly<{
  contractVersion: typeof TIMETABLE_IMPORT_HUMAN_DECISION_VERSION
  candidateId: string
  sourceFingerprint: string
  previewContractVersion: TimetableImportPreviewModel['contractVersion']
  decision: TimetableImportHumanDecision
}>

export type TimetableImportHumanDecisionResult =
  | Readonly<{ state: 'RECORDED'; receipt: TimetableImportHumanDecisionReceipt }>
  | Readonly<{
      state: 'DECISION_REJECTED'
      reason:
        | 'PREVIEW_NOT_COMPLETE'
        | 'CANDIDATE_ID_MISMATCH'
        | 'SOURCE_FINGERPRINT_MISMATCH'
        | 'PREVIEW_CONTRACT_MISMATCH'
    }>

/**
 * Pure G1.6-E decision builder.
 *
 * The returned receipt is evidence of a human decision on an exact preview.
 * It is not a persistence, draft-creation, apply, activation or replan capability.
 */
export function buildTimetableImportHumanDecision(
  preview: TimetableImportPreviewModel,
  request: TimetableImportHumanDecisionRequest,
): TimetableImportHumanDecisionResult {
  if (
    !preview.isPreviewComplete ||
    preview.state !== 'PREVIEW_READY' ||
    preview.reasonCode !== 'READY' ||
    preview.candidateId === null ||
    preview.provenance === null
  ) {
    return rejected('PREVIEW_NOT_COMPLETE')
  }

  if (request.previewContractVersion !== preview.contractVersion) {
    return rejected('PREVIEW_CONTRACT_MISMATCH')
  }
  if (request.candidateId !== preview.candidateId) {
    return rejected('CANDIDATE_ID_MISMATCH')
  }
  if (request.sourceFingerprint !== preview.provenance.sourceFingerprint.digest) {
    return rejected('SOURCE_FINGERPRINT_MISMATCH')
  }

  return {
    state: 'RECORDED',
    receipt: {
      contractVersion: TIMETABLE_IMPORT_HUMAN_DECISION_VERSION,
      candidateId: preview.candidateId,
      sourceFingerprint: preview.provenance.sourceFingerprint.digest,
      previewContractVersion: preview.contractVersion,
      decision: request.decision,
    },
  }
}

function rejected(
  reason: Extract<TimetableImportHumanDecisionResult, { state: 'DECISION_REJECTED' }>['reason'],
): TimetableImportHumanDecisionResult {
  return { state: 'DECISION_REJECTED', reason }
}
