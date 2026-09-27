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

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number)
  return hours * 60 + mins
}

function hasOverlappingLessons(slots: TimetableImportCandidateSlot[]) {
  const validLessons = slots.filter(validSlot)
  for (let i = 0; i < validLessons.length; i += 1) {
    for (let j = i + 1; j < validLessons.length; j += 1) {
      const left = validLessons[i]
      const right = validLessons[j]
      if (left.weekday !== right.weekday) continue
      if (minutes(left.startTime) < minutes(right.endTime) && minutes(right.startTime) < minutes(left.endTime)) {
        return true
      }
    }
  }
  return false
}

export function buildTimetableImportPreview(input: TimetableImportPreviewInput): TimetableImportPreview {
  const teacherSurname = input.teacherSurname.trim()
  // Preserve source time values exactly: malformed extraction must fail closed,
  // never be repaired silently before validation.
  const candidateSlots = input.candidateSlots.map((slot) => ({
    ...slot,
    classLabel: slot.classLabel.trim(),
  }))

  const blockingReasons: string[] = []
  if (!input.sourceName.trim()) blockingReasons.push('SOURCE_MISSING')
  if (!teacherSurname) blockingReasons.push('TEACHER_SURNAME_MISSING')
  if (!isRealIsoDate(input.effectiveFrom)) blockingReasons.push('EFFECTIVE_FROM_INVALID')
  if (candidateSlots.length === 0) blockingReasons.push('NO_LESSONS_FOUND')
  if (candidateSlots.some((slot) => !validSlot(slot))) blockingReasons.push('INVALID_LESSON_SLOT')
  if (hasOverlappingLessons(candidateSlots)) blockingReasons.push('AMBIGUOUS_OVERLAPPING_LESSONS')

  return {
    ...input,
    sourceName: input.sourceName.trim(),
    teacherSurname,
    candidateSlots,
    canConfirmDraft: blockingReasons.length === 0,
    blockingReasons,
  }
}
