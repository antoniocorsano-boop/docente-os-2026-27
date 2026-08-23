'use server'

import { revalidatePath } from 'next/cache'
import type { CalendarDayKind, CalendarEventKind, CalendarSourceKind } from '@/core/domain/calendar'
import { SupabaseCalendarRepository } from '@/core/infrastructure/supabase/supabase-calendar-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function saveCalendarDay(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseCalendarRepository()
  await repository.saveDay({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    localDate: text(formData, 'localDate'),
    dayKind: dayKind(text(formData, 'dayKind')),
    label: text(formData, 'label'),
    note: nullableText(formData, 'note'),
    sourceKind: sourceKind(text(formData, 'sourceKind')),
    sourceRef: nullableText(formData, 'sourceRef'),
  })
  revalidatePath('/calendario')
}

export async function deleteCalendarDay(formData: FormData) {
  await requireContext()
  const repository = new SupabaseCalendarRepository()
  await repository.deleteDay(text(formData, 'dayId'))
  revalidatePath('/calendario')
}

export async function createCalendarEvent(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseCalendarRepository()
  const timing = text(formData, 'timing')
  const allDay = timing !== 'TIMED'
  const startsOn = text(formData, 'startsOn')
  const endsOn = allDay ? text(formData, 'endsOn') || startsOn : startsOn
  const startTime = allDay ? null : nullableText(formData, 'startTime')
  const endTime = allDay ? null : nullableText(formData, 'endTime')

  if (!allDay && (!startTime || !endTime)) throw new Error('Start and end time are required for a timed event')

  await repository.createEvent({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    title: text(formData, 'title'),
    eventKind: eventKind(text(formData, 'eventKind')),
    startsOn,
    endsOn,
    allDay,
    startTime,
    endTime,
    note: nullableText(formData, 'note'),
    sourceKind: sourceKind(text(formData, 'sourceKind')),
    sourceRef: nullableText(formData, 'sourceRef'),
  })
  revalidatePath('/calendario')
}

export async function deleteCalendarEvent(formData: FormData) {
  await requireContext()
  const repository = new SupabaseCalendarRepository()
  await repository.deleteEvent(text(formData, 'eventId'))
  revalidatePath('/calendario')
}

async function requireContext() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') throw new Error(`${key} required`)
  return value.trim()
}

function nullableText(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') return null
  return value.trim() || null
}

function dayKind(value: string): CalendarDayKind {
  if (value === 'SCHOOL_DAY' || value === 'SUSPENSION' || value === 'HOLIDAY' || value === 'CLOSURE') return value
  throw new Error('Unsupported calendar day kind')
}

function eventKind(value: string): CalendarEventKind {
  if (value === 'INSTITUTION' || value === 'MEETING' || value === 'DEADLINE' || value === 'TRAINING' || value === 'OTHER') return value
  throw new Error('Unsupported calendar event kind')
}

function sourceKind(value: string): CalendarSourceKind {
  if (value === 'MANUAL' || value === 'INSTITUTION_DOCUMENT' || value === 'IMPORT') return value
  throw new Error('Unsupported calendar source kind')
}
