import type { TeacherResolutionResult } from './timetable-teacher-resolution'

export const TIMETABLE_IMPORT_CANDIDATE_VERSION = 'TTIC-1' as const

export type TimetableSourceFingerprint = Readonly<{
  algorithm: 'SHA-256'
  digest: string
}>

export type TimetableSourceProvenance = Readonly<{
  sourceFingerprint: TimetableSourceFingerprint
  sourceKind: 'OFFICIAL_DOCUMENT' | 'TEACHER_UPLOAD'
  sourceLabel: string
  effectiveFrom: string
  capturedAt?: string
}>

export type ExtractedTimetableSlot = Readonly<{
  day: number
  sourcePosition: string
  classLabel: string
  sourceTeacherLabel: string
  teacherResolution: TeacherResolutionResult
}>

export type TimetableImportCandidateReason =
  | 'READY'
  | 'INVALID_SOURCE_FINGERPRINT'
  | 'INVALID_EFFECTIVE_FROM'
  | 'INVALID_SLOT'
  | 'DUPLICATE_SLOT_CONFLICT'
  | 'TEACHER_REVIEW_REQUIRED'
  | 'EMPTY_TIMETABLE'

export type TimetableImportCandidate = Readonly<{
  contractVersion: typeof TIMETABLE_IMPORT_CANDIDATE_VERSION
  candidateId: string
  state: 'PREVIEW_READY' | 'REVIEW_REQUIRED'
  reasonCode: TimetableImportCandidateReason
  provenance: TimetableSourceProvenance
  slots: readonly CanonicalTimetableSlot[]
}>

export type CanonicalTimetableSlot = Readonly<{
  day: number
  sourcePosition: string
  classLabel: string
  sourceTeacherLabel: string
  resolvedAssignmentId?: string
  teacherResolutionState: TeacherResolutionResult['state']
  teacherResolutionReason: TeacherResolutionResult['reasonCode']
}>

const SHA256 = /^[0-9a-f]{64}$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Pure G1.6-C builder. It performs no I/O and never mutates an active timetable. */
export function buildTimetableImportCandidate(
  provenance: TimetableSourceProvenance,
  extractedSlots: readonly ExtractedTimetableSlot[],
): TimetableImportCandidate {
  if (!Array.isArray(extractedSlots) || extractedSlots.some((slot) => !validRawSlot(slot))) {
    return invalidSlotReview(provenance)
  }

  const canonicalSlots = canonicalizeSlots(extractedSlots)
  const base = {
    contractVersion: TIMETABLE_IMPORT_CANDIDATE_VERSION,
    provenance: cloneProvenance(provenance),
    slots: canonicalSlots,
  } as const

  if (!validFingerprint(provenance.sourceFingerprint)) {
    return review(base, 'INVALID_SOURCE_FINGERPRINT')
  }
  if (!validIsoDate(provenance.effectiveFrom)) {
    return review(base, 'INVALID_EFFECTIVE_FROM')
  }
  if (extractedSlots.length === 0) {
    return review(base, 'EMPTY_TIMETABLE')
  }
  if (extractedSlots.some((slot) => !validSlot(slot))) {
    return review(base, 'INVALID_SLOT')
  }
  if (hasDuplicateConflict(canonicalSlots)) {
    return review(base, 'DUPLICATE_SLOT_CONFLICT')
  }
  if (canonicalSlots.some((slot) => slot.teacherResolutionState !== 'RESOLVED' || !slot.resolvedAssignmentId)) {
    return review(base, 'TEACHER_REVIEW_REQUIRED')
  }

  const slots = deduplicateExact(canonicalSlots)
  return {
    ...base,
    slots,
    candidateId: candidateIdentity(provenance, slots),
    state: 'PREVIEW_READY',
    reasonCode: 'READY',
  }
}

function review(
  base: Omit<TimetableImportCandidate, 'candidateId' | 'state' | 'reasonCode'>,
  reasonCode: Exclude<TimetableImportCandidateReason, 'READY'>,
): TimetableImportCandidate {
  const slots = deduplicateExact(base.slots)
  return {
    ...base,
    slots,
    candidateId: candidateIdentity(base.provenance, slots),
    state: 'REVIEW_REQUIRED',
    reasonCode,
  }
}

function canonicalizeSlots(slots: readonly ExtractedTimetableSlot[]): CanonicalTimetableSlot[] {
  return slots
    .map((slot) => ({
      day: slot.day,
      sourcePosition: slot.sourcePosition.trim(),
      classLabel: normalizeClassLabel(slot.classLabel),
      sourceTeacherLabel: slot.sourceTeacherLabel.trim(),
      resolvedAssignmentId: slot.teacherResolution.resolvedAssignmentId,
      teacherResolutionState: slot.teacherResolution.state,
      teacherResolutionReason: slot.teacherResolution.reasonCode,
    }))
    .sort((a, b) => canonicalSlotKey(a).localeCompare(canonicalSlotKey(b)))
}

function deduplicateExact(slots: readonly CanonicalTimetableSlot[]): CanonicalTimetableSlot[] {
  const unique = new Map<string, CanonicalTimetableSlot>()
  for (const slot of slots) unique.set(canonicalSlotKey(slot), slot)
  return [...unique.values()].sort((a, b) => canonicalSlotKey(a).localeCompare(canonicalSlotKey(b)))
}

function hasDuplicateConflict(slots: readonly CanonicalTimetableSlot[]): boolean {
  const occupancy = new Map<string, string>()
  for (const slot of slots) {
    const key = occupancyKey(slot)
    const value = canonicalSlotKey(slot)
    const previous = occupancy.get(key)
    if (previous !== undefined && previous !== value) return true
    occupancy.set(key, value)
  }
  return false
}

function validRawSlot(slot: unknown): slot is ExtractedTimetableSlot {
  if (typeof slot !== 'object' || slot === null) return false
  const value = slot as Record<string, unknown>
  const resolution = value.teacherResolution
  if (typeof resolution !== 'object' || resolution === null) return false
  const teacherResolution = resolution as Record<string, unknown>
  return (
    typeof value.day === 'number' &&
    typeof value.sourcePosition === 'string' &&
    typeof value.classLabel === 'string' &&
    typeof value.sourceTeacherLabel === 'string' &&
    (teacherResolution.state === 'RESOLVED' || teacherResolution.state === 'REVIEW_REQUIRED') &&
    typeof teacherResolution.reasonCode === 'string' &&
    (teacherResolution.resolvedAssignmentId === undefined || typeof teacherResolution.resolvedAssignmentId === 'string')
  )
}

function validSlot(slot: ExtractedTimetableSlot): boolean {
  return (
    Number.isInteger(slot.day) &&
    slot.day >= 1 &&
    slot.day <= 7 &&
    slot.sourcePosition.trim().length > 0 &&
    slot.classLabel.trim().length > 0 &&
    slot.sourceTeacherLabel.trim().length > 0
  )
}

function invalidSlotReview(provenance: TimetableSourceProvenance): TimetableImportCandidate {
  return {
    contractVersion: TIMETABLE_IMPORT_CANDIDATE_VERSION,
    candidateId: 'INVALID_SLOT',
    state: 'REVIEW_REQUIRED',
    reasonCode: 'INVALID_SLOT',
    provenance: cloneProvenance(provenance),
    slots: [],
  }
}

function validFingerprint(fingerprint: TimetableSourceFingerprint): boolean {
  return fingerprint.algorithm === 'SHA-256' && SHA256.test(fingerprint.digest)
}

function validIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function candidateIdentity(provenance: TimetableSourceProvenance, slots: readonly CanonicalTimetableSlot[]): string {
  // sourceLabel/capturedAt are intentionally excluded: renaming the same source must not change identity.
  const slotIdentity = encodeSequence(slots.map(canonicalSlotKey))
  return encodeSequence([
    TIMETABLE_IMPORT_CANDIDATE_VERSION,
    provenance.sourceFingerprint.algorithm,
    provenance.sourceFingerprint.digest,
    provenance.effectiveFrom,
    slotIdentity,
  ])
}

function occupancyKey(slot: CanonicalTimetableSlot): string {
  return encodeSequence([String(slot.day), slot.sourcePosition, slot.classLabel])
}

function canonicalSlotKey(slot: CanonicalTimetableSlot): string {
  return encodeSequence([
    occupancyKey(slot),
    slot.sourceTeacherLabel,
    slot.resolvedAssignmentId ?? '',
    slot.teacherResolutionState,
    slot.teacherResolutionReason,
  ])
}

/** Injective framing for arbitrary UTF-16 strings: each field carries its own code-unit length. */
function encodeSequence(values: readonly string[]): string {
  return values.map((value) => `${value.length}:${value}`).join('')
}

function normalizeClassLabel(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toUpperCase()
}

function cloneProvenance(provenance: TimetableSourceProvenance): TimetableSourceProvenance {
  return {
    ...provenance,
    sourceFingerprint: { ...provenance.sourceFingerprint },
  }
}
