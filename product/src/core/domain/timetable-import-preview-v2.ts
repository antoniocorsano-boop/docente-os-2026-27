import type {
  CanonicalTimetableSlot,
  TimetableImportCandidate,
  TimetableImportCandidateReason,
  TimetableSourceProvenance,
} from './timetable-import-candidate'

export const TIMETABLE_IMPORT_PREVIEW_VERSION = 'TTIP-1' as const

export type TimetableImportPreviewRow = Readonly<{
  day: number
  sourcePosition: string
  classLabel: string
  sourceTeacherLabel: string
  resolvedAssignmentId: string | null
  teacherResolutionState: CanonicalTimetableSlot['teacherResolutionState']
  teacherResolutionReason: CanonicalTimetableSlot['teacherResolutionReason']
  requiresReview: boolean
}>

export type TimetableImportPreviewModel = Readonly<{
  contractVersion: typeof TIMETABLE_IMPORT_PREVIEW_VERSION
  candidateId: string | null
  state: TimetableImportCandidate['state']
  reasonCode: TimetableImportCandidateReason
  provenance: TimetableSourceProvenance | null
  isPreviewComplete: boolean
  rows: readonly TimetableImportPreviewRow[]
}>

/**
 * Pure G1.6-D projection.
 *
 * It performs no I/O, does not resolve teachers, and does not create or mutate
 * timetable versions. The candidate remains the sole semantic authority.
 */
export function projectTimetableImportPreview(
  candidate: TimetableImportCandidate,
): TimetableImportPreviewModel {
  const provenance = candidate.provenance ? cloneProvenance(candidate.provenance) : null
  const rows = candidate.slots.map(projectRow)

  return {
    contractVersion: TIMETABLE_IMPORT_PREVIEW_VERSION,
    candidateId: candidate.candidateId,
    state: candidate.state,
    reasonCode: candidate.reasonCode,
    provenance,
    isPreviewComplete:
      candidate.state === 'PREVIEW_READY' &&
      candidate.reasonCode === 'READY' &&
      candidate.candidateId !== null &&
      provenance !== null,
    rows,
  }
}

function projectRow(slot: CanonicalTimetableSlot): TimetableImportPreviewRow {
  return {
    day: slot.day,
    sourcePosition: slot.sourcePosition,
    classLabel: slot.classLabel,
    sourceTeacherLabel: slot.sourceTeacherLabel,
    resolvedAssignmentId: slot.resolvedAssignmentId ?? null,
    teacherResolutionState: slot.teacherResolutionState,
    teacherResolutionReason: slot.teacherResolutionReason,
    requiresReview: slot.teacherResolutionState !== 'RESOLVED' || !slot.resolvedAssignmentId,
  }
}

function cloneProvenance(provenance: TimetableSourceProvenance): TimetableSourceProvenance {
  return {
    ...provenance,
    sourceFingerprint: { ...provenance.sourceFingerprint },
  }
}
