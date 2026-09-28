import type { TimetableVersion } from './timetable'
import type { TimetableImportApplyReadiness } from './timetable-import-apply-readiness'

export const TIMETABLE_IMPORT_DRAFT_TARGET_BINDING_VERSION = 'TTDT-1' as const

export type TimetableDraftTargetSnapshot = Readonly<{
  version: TimetableVersion
  revisionToken: string
}>

export type TimetableDraftTargetContext = Readonly<{
  workspaceId: string
  academicYearId: string
  expectedRevisionToken: string
}>

export type TimetableImportDraftTargetBinding =
  | Readonly<{
      contractVersion: typeof TIMETABLE_IMPORT_DRAFT_TARGET_BINDING_VERSION
      state: 'BOUND'
      candidateId: string
      sourceFingerprint: string
      targetVersionId: string
      workspaceId: string
      academicYearId: string
      effectiveFrom: string
      expectedRevisionToken: string
    }>
  | Readonly<{
      contractVersion: typeof TIMETABLE_IMPORT_DRAFT_TARGET_BINDING_VERSION
      state: 'BLOCKED'
      reason:
        | 'READINESS_NOT_READY'
        | 'INVALID_TARGET_CONTEXT'
        | 'TARGET_NOT_DRAFT'
        | 'TARGET_CONTEXT_MISMATCH'
        | 'EFFECTIVE_FROM_MISMATCH'
        | 'DRAFT_REVISION_REQUIRED'
        | 'DRAFT_REVISION_MISMATCH'
    }>

/**
 * Pure G1.6-I preflight.
 *
 * This binds a G1.6-H READY projection to one exact DRAFT snapshot. It does not
 * calculate the authoritative revision token and performs no I/O or mutation.
 */
export function bindTimetableImportToDraftTarget(
  readiness: TimetableImportApplyReadiness,
  target: TimetableDraftTargetSnapshot,
  context: TimetableDraftTargetContext,
): TimetableImportDraftTargetBinding {
  if (readiness.state !== 'READY') return blocked('READINESS_NOT_READY')

  if (
    !nonEmpty(context.workspaceId) ||
    !nonEmpty(context.academicYearId) ||
    !nonEmpty(target.version.id)
  ) {
    return blocked('INVALID_TARGET_CONTEXT')
  }

  if (target.version.status !== 'DRAFT') return blocked('TARGET_NOT_DRAFT')

  if (
    target.version.workspaceId !== context.workspaceId ||
    target.version.academicYearId !== context.academicYearId
  ) {
    return blocked('TARGET_CONTEXT_MISMATCH')
  }

  if (target.version.effectiveFrom !== readiness.effectiveFrom) {
    return blocked('EFFECTIVE_FROM_MISMATCH')
  }

  if (!nonEmpty(target.revisionToken) || !nonEmpty(context.expectedRevisionToken)) {
    return blocked('DRAFT_REVISION_REQUIRED')
  }

  if (target.revisionToken !== context.expectedRevisionToken) {
    return blocked('DRAFT_REVISION_MISMATCH')
  }

  return {
    contractVersion: TIMETABLE_IMPORT_DRAFT_TARGET_BINDING_VERSION,
    state: 'BOUND',
    candidateId: readiness.candidateId,
    sourceFingerprint: readiness.sourceFingerprint,
    targetVersionId: target.version.id,
    workspaceId: context.workspaceId,
    academicYearId: context.academicYearId,
    effectiveFrom: readiness.effectiveFrom,
    expectedRevisionToken: context.expectedRevisionToken,
  }
}

function blocked(
  reason: Extract<TimetableImportDraftTargetBinding, { state: 'BLOCKED' }>['reason'],
): TimetableImportDraftTargetBinding {
  return {
    contractVersion: TIMETABLE_IMPORT_DRAFT_TARGET_BINDING_VERSION,
    state: 'BLOCKED',
    reason,
  }
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0
}
