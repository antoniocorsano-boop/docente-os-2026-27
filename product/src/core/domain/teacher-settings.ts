export type TeacherWorkspaceSettings = {
  id: string
  workspaceId: string
  academicYearId: string
  userId: string
  teacherDisplayName: string
  schoolName: string
  schoolCode: string | null
  schoolCity: string | null
  schoolType: string
  dailyPeriodCount: number
  schoolDayStart: string
  defaultPeriodMinutes: number
  teachingWeekdays: number[]
  createdAt: string
  updatedAt: string
}

export type TeachingDiscipline = {
  id: string
  workspaceId: string
  academicYearId: string
  name: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type SaveTeacherWorkspaceSettingsInput = {
  workspaceId: string
  academicYearId: string
  teacherDisplayName: string
  schoolName: string
  schoolCode: string | null
  schoolCity: string | null
  schoolType: string
  dailyPeriodCount: number
  schoolDayStart: string
  defaultPeriodMinutes: number
  teachingWeekdays: number[]
}

export const WEEKDAYS = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
] as const

export function normalizeWeekdays(values: number[]) {
  const normalized = [...new Set(values.filter((value) => Number.isInteger(value) && value >= 1 && value <= 6))].sort((a, b) => a - b)
  if (!normalized.length) throw new Error('At least one teaching weekday is required')
  return normalized
}

export function normalizeSettingsText(value: string, maxLength: number) {
  const normalized = value.trim()
  if (normalized.length > maxLength) throw new Error(`Value exceeds ${maxLength} characters`)
  return normalized
}
