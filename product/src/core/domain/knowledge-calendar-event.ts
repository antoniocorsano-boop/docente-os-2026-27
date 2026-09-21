import type { CalendarEventKind } from './calendar'

export type KnowledgeCalendarEventProposal = {
  title: string
  date: string
  startTime: string
  endTime: string
  eventKind: CalendarEventKind
  location: string | null
  mandatory: boolean
  attendanceMode: 'IN_PERSON' | 'REMOTE' | 'UNSPECIFIED'
  evidence: string
}

export function knowledgeCalendarEventProposal(structuredData: Record<string, unknown>): KnowledgeCalendarEventProposal | null {
  const candidate = structuredData.calendarEvent
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
  const value = candidate as Record<string, unknown>

  const title = boundedText(value.title, 200)
  const date = localDate(value.date)
  const startTime = localTime(value.startTime)
  const endTime = localTime(value.endTime)
  const eventKind = calendarEventKind(value.eventKind)
  const attendanceMode = attendance(value.attendanceMode)
  const evidence = boundedText(value.evidence, 2000)
  if (!title || !date || !startTime || !endTime || startTime >= endTime || !eventKind || !attendanceMode || !evidence) return null

  return {
    title,
    date,
    startTime,
    endTime,
    eventKind,
    location: nullableBoundedText(value.location, 500),
    mandatory: value.mandatory === true,
    attendanceMode,
    evidence,
  }
}

function boundedText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized && normalized.length <= maxLength ? normalized : null
}

function nullableBoundedText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === '') return null
  return boundedText(value, maxLength)
}

function localDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value
}

function localTime(value: unknown) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null
}

function calendarEventKind(value: unknown): CalendarEventKind | null {
  return value === 'INSTITUTION' || value === 'MEETING' || value === 'DEADLINE' || value === 'TRAINING' || value === 'OTHER' ? value : null
}

function attendance(value: unknown): KnowledgeCalendarEventProposal['attendanceMode'] | null {
  return value === 'IN_PERSON' || value === 'REMOTE' || value === 'UNSPECIFIED' ? value : null
}
