import { timeToMinutes, type TimetableSlot } from '@/core/domain/timetable'

export type TimetableGridPeriod = {
  ordinal: number
  start: string
  end: string
}

export type TimetableGridRow = {
  key: string
  start: string
  end: string
  ordinal: number | null
  source: 'PRESET' | 'CUSTOM'
}

export function buildTimetableGridRows(
  periods: TimetableGridPeriod[],
  slots: TimetableSlot[],
): TimetableGridRow[] {
  const rows = new Map<string, TimetableGridRow>()

  for (const period of periods) {
    const key = rowKey(period.start, period.end)
    rows.set(key, {
      key,
      start: normalizeGridTime(period.start),
      end: normalizeGridTime(period.end),
      ordinal: period.ordinal,
      source: 'PRESET',
    })
  }

  for (const slot of slots) {
    const key = rowKey(slot.startTime, slot.endTime)
    if (rows.has(key)) continue
    rows.set(key, {
      key,
      start: normalizeGridTime(slot.startTime),
      end: normalizeGridTime(slot.endTime),
      ordinal: slot.ordinal,
      source: 'CUSTOM',
    })
  }

  return [...rows.values()].sort((left, right) => {
    const byStart = timeToMinutes(left.start) - timeToMinutes(right.start)
    if (byStart !== 0) return byStart
    return timeToMinutes(left.end) - timeToMinutes(right.end)
  })
}

export function timetableCellKey(weekday: number, startTime: string, endTime: string) {
  return `${weekday}:${rowKey(startTime, endTime)}`
}

function rowKey(startTime: string, endTime: string) {
  return `${normalizeGridTime(startTime)}-${normalizeGridTime(endTime)}`
}

function normalizeGridTime(value: string) {
  return value.slice(0, 5)
}
