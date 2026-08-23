import type {
  CalendarDay,
  CalendarDayKind,
  CalendarEvent,
  CalendarEventKind,
  CalendarSnapshot,
  CalendarSourceKind,
} from '@/core/domain/calendar'
import {
  asCalendarDayKind,
  asCalendarEventKind,
  asCalendarSourceKind,
} from '@/core/domain/calendar'
import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

type CalendarDayRow = Database['public']['Tables']['calendar_days']['Row']
type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row']

export class SupabaseCalendarRepository {
  async list(workspaceId: string, academicYearId: string): Promise<CalendarSnapshot> {
    const supabase = await createClient()
    const [{ data: days, error: daysError }, { data: events, error: eventsError }] = await Promise.all([
      supabase
        .from('calendar_days')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId)
        .order('local_date'),
      supabase
        .from('calendar_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId)
        .order('starts_on')
        .order('start_time'),
    ])

    if (daysError) throw new Error(daysError.message)
    if (eventsError) throw new Error(eventsError.message)
    return { days: days.map(toDay), events: events.map(toEvent) }
  }

  async saveDay(input: {
    workspaceId: string
    academicYearId: string
    localDate: string
    dayKind: CalendarDayKind
    label: string
    note: string | null
    sourceKind: CalendarSourceKind
    sourceRef: string | null
  }): Promise<CalendarDay> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const { data: existing, error: existingError } = await supabase
      .from('calendar_days')
      .select('id')
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .eq('local_date', input.localDate)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)

    const payload = {
      day_kind: input.dayKind,
      label: input.label.trim(),
      note: input.note,
      source_kind: input.sourceKind,
      source_ref: input.sourceRef,
    }

    const query = existing
      ? supabase.from('calendar_days').update(payload).eq('id', existing.id)
      : supabase.from('calendar_days').insert({
          workspace_id: input.workspaceId,
          academic_year_id: input.academicYearId,
          local_date: input.localDate,
          ...payload,
          created_by: userId,
        })

    const { data, error } = await query.select('*').single()
    if (error) throw new Error(error.message)
    return toDay(data)
  }

  async deleteDay(dayId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('calendar_days').delete().eq('id', dayId)
    if (error) throw new Error(error.message)
  }

  async createEvent(input: {
    workspaceId: string
    academicYearId: string
    title: string
    eventKind: CalendarEventKind
    startsOn: string
    endsOn: string
    allDay: boolean
    startTime: string | null
    endTime: string | null
    note: string | null
    sourceKind: CalendarSourceKind
    sourceRef: string | null
  }): Promise<CalendarEvent> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        title: input.title.trim(),
        event_kind: input.eventKind,
        starts_on: input.startsOn,
        ends_on: input.endsOn,
        all_day: input.allDay,
        start_time: input.allDay ? null : input.startTime,
        end_time: input.allDay ? null : input.endTime,
        note: input.note,
        source_kind: input.sourceKind,
        source_ref: input.sourceRef,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toEvent(data)
  }

  async deleteEvent(eventId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
    if (error) throw new Error(error.message)
  }
}

function toDay(row: CalendarDayRow): CalendarDay {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    localDate: row.local_date,
    dayKind: asCalendarDayKind(row.day_kind),
    label: row.label,
    note: row.note,
    sourceKind: asCalendarSourceKind(row.source_kind),
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    title: row.title,
    eventKind: asCalendarEventKind(row.event_kind),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    allDay: row.all_day,
    startTime: row.start_time?.slice(0, 5) ?? null,
    endTime: row.end_time?.slice(0, 5) ?? null,
    note: row.note,
    sourceKind: asCalendarSourceKind(row.source_kind),
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function authenticatedUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}
