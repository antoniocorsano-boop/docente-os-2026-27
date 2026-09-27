import type { TimetableSlotKind } from './timetable'

export type TimetableImportSourceKind = 'DOCUMENT' | 'IMAGE'

export type TimetableImportCandidateSlot = {
  weekday: number
  startTime: string
  endTime: string
  classLabel: string
  slotKind: TimetableSlotKind
}

export type TimetableImportPreviewInput = {
  sourceKind: TimetableImportSourceKind
  sourceName: string
  teacherSurname: string
  effectiveFrom: string
  candidateSlots: TimetableImportCandidateSlot[]
}

export type TimetableImportPreview = TimetableImportPreviewInput & {
  teacherSurname: string
  candidateSlots: TimetableImportCandidateSlot[]
  canConfirmDraft: boolean
  blockingReasons: string[]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

function isRealIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function validSlot(slot: TimetableImportCandidateSlot) {
  if (!Number.isInteger(slot.weekday) || slot.weekday < 1 || slot.weekday > 6) return false
  if (!HH_MM.test(slot.startTime) || !HH_MM.test(slot.endTime)) return false
  if (slot.endTime <= slot.startTime) return false
  if (!slot.classLabel.trim()) return false
  // Structural import deliberately excludes later teacher specialisations.
  return slot.slotKind === 'LESSON'
}

export function buildTimetableImportPreview(input: TimetableImportPreviewInput): TimetableImportPreview {
  const teacherSurname = input.teacherSurname.trim()
  const candidateSlots = input.candidateSlots.map((slot) => ({
    ...slot,
    classLabel: slot.classLabel.trim(),
    startTime: slot.startTime.slice(0, 5),
    endTime: slot.endTime.slice(0, 5),
  }))

  const blockingReasons: string[] = []
  if (!input.sourceName.trim()) blockingReasons.push('SOURCE_MISSING')
  if (!teacherSurname) blockingReasons.push('TEACHER_SURNAME_MISSING')
  if (!isRealIsoDate(input.effectiveFrom)) blockingReasons.push('EFFECTIVE_FROM_INVALID')
  if (candidateSlots.length === 0) blockingReasons.push('NO_LESSONS_FOUND')
  if (candidateSlots.some((slot) => !validSlot(slot))) blockingReasons.push('INVALID_LESSON_SLOT')

  const duplicateKeys = new Set<string>()
  const seenKeys = new Set<string>()
  for (const slot of candidateSlots) {
    const key = `${slot.weekday}|${slot.startTime}|${slot.endTime}`
    if (seenKeys.has(key)) duplicateKeys.add(key)
    seenKeys.add(key)
  }
  if (duplicateKeys.size > 0) blockingReasons.push('AMBIGUOUS_OVERLAPPING_LESSONS')

  return {
    ...input,
    sourceName: input.sourceName.trim(),
    teacherSurname,
    candidateSlots,
    canConfirmDraft: blockingReasons.length === 0,
    blockingReasons,
  }
}
