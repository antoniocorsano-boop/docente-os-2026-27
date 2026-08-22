export type TeachingAssignmentStatus = 'PROVISIONAL' | 'CONFIRMED'
export type TimetableVersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type TimetableSourceKind = 'MANUAL' | 'INSTITUTION_DOCUMENT' | 'IMPORT'
export type TimetableSlotKind = 'LESSON' | 'CLASS_PRESENCE' | 'DISPOSITION' | 'RECEPTION' | 'OTHER'
export type TimetablePresenceKind = 'SUBSTITUTION' | 'CO_TEACHING' | 'SUPERVISION' | 'PROJECT' | 'OTHER'

export type TeachingAssignment = {
  id: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  disciplineId: string
  weeklyMinutes: number
  status: TeachingAssignmentStatus
  sourceNote: string | null
  createdAt: string
  updatedAt: string
}

export type TimetableVersion = {
  id: string
  workspaceId: string
  academicYearId: string
  label: string
  status: TimetableVersionStatus
  effectiveFrom: string
  effectiveTo: string | null
  sourceKind: TimetableSourceKind
  sourceRef: string | null
  createdAt: string
  updatedAt: string
}

export type TimetableSlot = {
  id: string
  timetableVersionId: string
  weekday: number
  startTime: string
  endTime: string
  slotKind: TimetableSlotKind
  sectionId: string | null
  disciplineId: string | null
  teachingAssignmentId: string | null
  manualClassLabel: string | null
  presenceKind: TimetablePresenceKind | null
  room: string | null
  note: string | null
  ordinal: number | null
  createdAt: string
  updatedAt: string
}

export type TimetableT1Snapshot = {
  assignments: TeachingAssignment[]
  draftVersion: TimetableVersion
  slots: TimetableSlot[]
}

export function asTeachingAssignmentStatus(value: string): TeachingAssignmentStatus {
  if (value === 'PROVISIONAL' || value === 'CONFIRMED') return value
  throw new Error(`Unsupported teaching assignment status: ${value}`)
}

export function asTimetableVersionStatus(value: string): TimetableVersionStatus {
  if (value === 'DRAFT' || value === 'ACTIVE' || value === 'ARCHIVED') return value
  throw new Error(`Unsupported timetable version status: ${value}`)
}

export function asTimetableSourceKind(value: string): TimetableSourceKind {
  if (value === 'MANUAL' || value === 'INSTITUTION_DOCUMENT' || value === 'IMPORT') return value
  throw new Error(`Unsupported timetable source kind: ${value}`)
}

export function asTimetableSlotKind(value: string): TimetableSlotKind {
  if (value === 'LESSON' || value === 'CLASS_PRESENCE' || value === 'DISPOSITION' || value === 'RECEPTION' || value === 'OTHER') return value
  throw new Error(`Unsupported timetable slot kind: ${value}`)
}

export function asTimetablePresenceKind(value: string | null): TimetablePresenceKind | null {
  if (value == null) return null
  if (value === 'SUBSTITUTION' || value === 'CO_TEACHING' || value === 'SUPERVISION' || value === 'PROJECT' || value === 'OTHER') return value
  throw new Error(`Unsupported timetable presence kind: ${value}`)
}

export const TIMETABLE_WEEKDAYS = [
  { value: 1, label: 'Lunedì', short: 'Lun' },
  { value: 2, label: 'Martedì', short: 'Mar' },
  { value: 3, label: 'Mercoledì', short: 'Mer' },
  { value: 4, label: 'Giovedì', short: 'Gio' },
  { value: 5, label: 'Venerdì', short: 'Ven' },
  { value: 6, label: 'Sabato', short: 'Sab' },
] as const

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) throw new Error(`Invalid time: ${value}`)
  return hours * 60 + minutes
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function slotDurationMinutes(startTime: string, endTime: string) {
  return timeToMinutes(endTime) - timeToMinutes(startTime)
}
