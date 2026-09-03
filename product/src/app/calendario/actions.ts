'use server'

import { revalidatePath } from 'next/cache'
import type { CalendarDayKind, CalendarEventKind, CalendarSourceKind } from '@/core/domain/calendar'
import { SupabaseCalendarRepository } from '@/core/infrastructure/supabase/supabase-calendar-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  assertCalendarDayWithinAcademicYear,
  assertCalendarEventWithinAcademicYear,
} from './calendar-command-guard'

export async function saveCalendarDay(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseCalendarRepository()
  const localDate = text(formData, 'localDate')

  assertCalendarDayWithinAcademicYear(localDate, {
    startsOn: context.academicYear.startsOn,
    endsOn: context.academicYear.endsOn,
  })

  await repository.saveDay({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    localDate,
    dayKind: dayKind(text(formData, 'dayKind')),
    label: text(formData, 'label'),
    note: nullableText(formData, 'note'),
    sourceKind: sourceKind(text(formData, 'sourceKind')),
    sourceRef: nullableText(formData, 'sourceRef'),
  })
  revalidatePath('/calendario')
}

export async function deleteCalendarDay(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseCalendarRepository()
  await repository.deleteDay({
    dayId: text(formData, 'dayId'),
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
  })
  revalidatePath('/calendario')
}

export async function createCalendarEvent(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseCalendarRepository()
  const timing = text(formData, 'timing')
  const allDay = timing !== 'TIMED'
  const startsOn = text(formData, 'startsOn')
  const endsOn = text(formData, 'endsOn')
  const startTime = allDay ? null : nullableText(formData, 'startTime')
  const endTime = allDay ? null : nullableText(formData, 'endTime')

  assertCalendarEventWithinAcademicYear(
    { startsOn, endsOn, allDay, startTime, endTime },
    { startsOn: context.academicYear.startsOn, endsOn: context.academicYear.endsOn },
  )

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
  const context = await requireContext()
  const repository = new SupabaseCalendarRepository()
  await repository.deleteEvent({
    eventId: text(formData, 'eventId'),
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
  })
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
