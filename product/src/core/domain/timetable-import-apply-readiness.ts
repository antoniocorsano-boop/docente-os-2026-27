import type {
  CanonicalTimetableSlot,
  TimetableImportCandidate,
} from './timetable-import-candidate'
import type { TimetableImportHumanDecisionReceipt } from './timetable-import-human-decision'

export const TIMETABLE_IMPORT_APPLY_READINESS_VERSION = 'TTAR-1' as const

export type TimetableImportTimeBinding = Readonly<{
  day: number
  sourcePosition: string
  startTime: string
  endTime: string
  ordinal?: number | null
}>

export type TimetableImportReadySlot = Readonly<{
  day: number
  sourcePosition: string
  classLabel: string
  sourceTeacherLabel: string
  resolvedAssignmentId: string
  startTime: string
  endTime: string
  ordinal: number | null
}>

export type TimetableImportApplyReadiness =
  | Readonly<{
      contractVersion: typeof TIMETABLE_IMPORT_APPLY_READINESS_VERSION
      state: 'READY'
      candidateId: string
      sourceFingerprint: string
      effectiveFrom: string
      slots: readonly TimetableImportReadySlot[]
    }>
  | Readonly<{
      contractVersion: typeof TIMETABLE_IMPORT_APPLY_READINESS_VERSION
      state: 'BLOCKED'
      reason:
        | 'CANDIDATE_NOT_READY'
        | 'DECISION_NOT_CONFIRMED'
        | 'CANDIDATE_ID_MISMATCH'
        | 'SOURCE_FINGERPRINT_MISMATCH'
        | 'UNRESOLVED_ASSIGNMENT'
        | 'INVALID_TIME_BINDING'
        | 'DUPLICATE_TIME_BINDING'
        | 'MISSING_TIME_BINDING'
        | 'EXTRA_TIME_BINDING'
        | 'TIME_OVERLAP'
    }>

/**
 * Pure G1.6-H apply-readiness projection.
 *
 * READY is descriptive only. This function performs no I/O and does not create,
 * mutate, activate or archive timetable versions.
 */
export function buildTimetableImportApplyReadiness(
  candidate: TimetableImportCandidate,
  receipt: TimetableImportHumanDecisionReceipt,
  timeBindings: readonly TimetableImportTimeBinding[],
): TimetableImportApplyReadiness {
  if (
    candidate.state !== 'PREVIEW_READY' ||
    candidate.reasonCode !== 'READY' ||
    candidate.candidateId === null ||
    candidate.provenance === null
  ) {
    return blocked('CANDIDATE_NOT_READY')
  }

  if (receipt.decision !== 'CONFIRM_PREVIEW') {
    return blocked('DECISION_NOT_CONFIRMED')
  }
  if (receipt.candidateId !== candidate.candidateId) {
    return blocked('CANDIDATE_ID_MISMATCH')
  }
  if (receipt.sourceFingerprint !== candidate.provenance.sourceFingerprint.digest) {
    return blocked('SOURCE_FINGERPRINT_MISMATCH')
  }
  if (candidate.slots.some((slot) => !isResolved(slot))) {
    return blocked('UNRESOLVED_ASSIGNMENT')
  }
  if (!Array.isArray(timeBindings) || timeBindings.some((binding) => !validBinding(binding))) {
    return blocked('INVALID_TIME_BINDING')
  }

  const bindings = new Map<string, TimetableImportTimeBinding>()
  for (const binding of timeBindings) {
    const key = bindingKey(binding.day, binding.sourcePosition)
    if (bindings.has(key)) return blocked('DUPLICATE_TIME_BINDING')
    bindings.set(key, cloneBinding(binding))
  }

  const requiredKeys = new Set(candidate.slots.map((slot) => bindingKey(slot.day, slot.sourcePosition)))
  for (const key of requiredKeys) {
    if (!bindings.has(key)) return blocked('MISSING_TIME_BINDING')
  }
  for (const key of bindings.keys()) {
    if (!requiredKeys.has(key)) return blocked('EXTRA_TIME_BINDING')
  }

  const slots = candidate.slots.map((slot) => {
    const binding = bindings.get(bindingKey(slot.day, slot.sourcePosition))
    if (!binding || !slot.resolvedAssignmentId) {
      throw new Error('G1.6-H invariant violated after preflight')
    }
    return {
      day: slot.day,
      sourcePosition: slot.sourcePosition,
      classLabel: slot.classLabel,
      sourceTeacherLabel: slot.sourceTeacherLabel,
      resolvedAssignmentId: slot.resolvedAssignmentId,
      startTime: binding.startTime,
      endTime: binding.endTime,
      ordinal: binding.ordinal ?? null,
    }
  })

  if (hasOverlap(slots)) return blocked('TIME_OVERLAP')

  return {
    contractVersion: TIMETABLE_IMPORT_APPLY_READINESS_VERSION,
    state: 'READY',
    candidateId: candidate.candidateId,
    sourceFingerprint: candidate.provenance.sourceFingerprint.digest,
    effectiveFrom: candidate.provenance.effectiveFrom,
    slots: slots.map((slot) => ({ ...slot })),
  }
}

function blocked(
  reason: Extract<TimetableImportApplyReadiness, { state: 'BLOCKED' }>['reason'],
): TimetableImportApplyReadiness {
  return {
    contractVersion: TIMETABLE_IMPORT_APPLY_READINESS_VERSION,
    state: 'BLOCKED',
    reason,
  }
}

function isResolved(slot: CanonicalTimetableSlot): boolean {
  return (
    slot.teacherResolutionState === 'RESOLVED' &&
    typeof slot.resolvedAssignmentId === 'string' &&
    slot.resolvedAssignmentId.length > 0
  )
}

function validBinding(binding: unknown): binding is TimetableImportTimeBinding {
  if (typeof binding !== 'object' || binding === null) return false
  const value = binding as Record<string, unknown>
  if (!Number.isInteger(value.day) || (value.day as number) < 1 || (value.day as number) > 6) return false
  if (typeof value.sourcePosition !== 'string' || value.sourcePosition.trim().length === 0) return false
  if (typeof value.startTime !== 'string' || typeof value.endTime !== 'string') return false
  if (!validTime(value.startTime) || !validTime(value.endTime)) return false
  if (timeToMinutes(value.endTime) <= timeToMinutes(value.startTime)) return false
  if (
    value.ordinal !== undefined &&
    value.ordinal !== null &&
    (!Number.isInteger(value.ordinal) || (value.ordinal as number) < 1 || (value.ordinal as number) > 20)
  ) {
    return false
  }
  return true
}

function cloneBinding(binding: TimetableImportTimeBinding): TimetableImportTimeBinding {
  return {
    day: binding.day,
    sourcePosition: binding.sourcePosition,
    startTime: binding.startTime,
    endTime: binding.endTime,
    ordinal: binding.ordinal ?? null,
  }
}

function bindingKey(day: number, sourcePosition: string): string {
  return encodeSequence([String(day), sourcePosition])
}

function hasOverlap(slots: readonly TimetableImportReadySlot[]): boolean {
  const byDay = new Map<number, TimetableImportReadySlot[]>()
  for (const slot of slots) {
    const daySlots = byDay.get(slot.day) ?? []
    daySlots.push(slot)
    byDay.set(slot.day, daySlots)
  }

  for (const daySlots of byDay.values()) {
    const ordered = [...daySlots].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime) || timeToMinutes(a.endTime) - timeToMinutes(b.endTime),
    )
    for (let index = 1; index < ordered.length; index += 1) {
      if (timeToMinutes(ordered[index].startTime) < timeToMinutes(ordered[index - 1].endTime)) {
        return true
      }
    }
  }
  return false
}

function validTime(value: string): boolean {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function encodeSequence(values: readonly string[]): string {
  return values.map((value) => `${value.length}:${value}`).join('')
}
