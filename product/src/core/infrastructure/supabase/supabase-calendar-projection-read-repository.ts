import type {
  CalendarProjectionReadPort,
  CalendarDayReadModel,
  CalendarEventReadModel,
} from '@/core/application/ports/temporal-projection'
import { SupabaseCalendarRepository } from '@/core/infrastructure/supabase/supabase-calendar-repository'

export class SupabaseCalendarProjectionReadRepository implements CalendarProjectionReadPort {
  async read(workspaceId: string, academicYearId: string) {
    const snapshot = await new SupabaseCalendarRepository().list(workspaceId, academicYearId)

    const days: CalendarDayReadModel[] = snapshot.days.map((day) => ({
      id: day.id,
      localDate: day.localDate,
      kind: day.dayKind,
      label: day.label,
    }))

    const events: CalendarEventReadModel[] = snapshot.events.map((event) => ({
      id: event.id,
      title: event.title,
      kind: event.eventKind,
      startsOn: event.startsOn,
      endsOn: event.endsOn,
      allDay: event.allDay,
      startTime: event.startTime,
      endTime: event.endTime,
      note: event.note,
    }))

    return { days, events }
  }
}
