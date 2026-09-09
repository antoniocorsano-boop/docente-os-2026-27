export type DailyBriefPreference = {
  id: string
  workspaceId: string
  academicYearId: string
  userId: string
  enabled: boolean
  localTime: string
  createdAt: string
  updatedAt: string
}

export function normalizeDailyBriefTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid daily brief time')
  return value
}
