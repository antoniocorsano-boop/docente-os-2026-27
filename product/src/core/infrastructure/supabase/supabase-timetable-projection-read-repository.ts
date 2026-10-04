import type {
  TemporalExceptionReadModel,
  TimetableProjectionReadPort,
  TimetableSlotReadModel,
  TimetableVersionReadModel,
} from '@/core/application/ports/temporal-projection'
import {
  asTimetableActivityKind,
  asTimetableSlotKind,
  asTimetableVersionStatus,
} from '@/core/domain/timetable'
import { createClient } from '@/lib/supabase/server'

const GRADE_LABELS: Record<string, string> = { PRIMA: '1ª', SECONDA: '2ª', TERZA: '3ª' }

export class SupabaseTimetableProjectionReadRepository implements TimetableProjectionReadPort {
  async read(workspaceId: string, academicYearId: string) {
    const supabase = await createClient()
    const [versionsResult, sectionsResult, disciplinesResult] = await Promise.all([
      supabase
        .from('timetable_versions')
        .select('id,status,effective_from,effective_to')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId),
      supabase
        .from('annual_plan_sections')
        .select('id,grade,section_code')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId),
      supabase
        .from('teaching_disciplines')
        .select('id,name')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId),
    ])

    if (versionsResult.error) throw new Error(versionsResult.error.message)
    if (sectionsResult.error) throw new Error(sectionsResult.error.message)
    if (disciplinesResult.error) throw new Error(disciplinesResult.error.message)

    const versions: TimetableVersionReadModel[] = versionsResult.data.map((row) => ({
      id: row.id,
      status: asTimetableVersionStatus(row.status),
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
    }))
    const versionIds = versions.map((version) => version.id)
    if (!versionIds.length) return { versions, slots: [], exceptions: [] }

    const [{ data: slotRows, error: slotsError }, { data: exceptionRows, error: exceptionsError }] = await Promise.all([
      supabase
        .from('timetable_slots')
        .select('id,timetable_version_id,weekday,start_time,end_time,slot_kind,section_id,discipline_id,manual_class_label,room,activity_kind')
        .in('timetable_version_id', versionIds),
      supabase
        .from('timetable_exceptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId)
        .in('timetable_version_id', versionIds),
    ])

    if (slotsError) throw new Error(slotsError.message)
    if (exceptionsError) throw new Error(exceptionsError.message)

    const sectionLabels = new Map(sectionsResult.data.map((row) => [row.id, `${GRADE_LABELS[row.grade] ?? row.grade} ${row.section_code}`]))
    const disciplineLabels = new Map(disciplinesResult.data.map((row) => [row.id, row.name]))
    const slots: TimetableSlotReadModel[] = slotRows.map((row) => ({
      id: row.id,
      timetableVersionId: row.timetable_version_id,
      weekday: row.weekday,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
      kind: asTimetableSlotKind(row.slot_kind),
      sectionId: row.section_id,
      sectionLabel: row.section_id ? sectionLabels.get(row.section_id) ?? null : null,
      disciplineId: row.discipline_id,
      disciplineLabel: row.discipline_id ? disciplineLabels.get(row.discipline_id) ?? null : null,
      manualClassLabel: row.manual_class_label,
      room: row.room,
      activityKind: asTimetableActivityKind(row.activity_kind),
    }))

    const exceptions: TemporalExceptionReadModel[] = exceptionRows.map((row) => {
      const activityKind = asTimetableActivityKind(row.activity_kind)
      if (!activityKind) throw new Error('Timetable exception requires activity kind')
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        academicYearId: row.academic_year_id,
        localDate: row.local_date,
        timetableVersionId: row.timetable_version_id,
        timetableSlotId: row.timetable_slot_id,
        kind: 'ACTIVITY_KIND_CHANGED',
        activityKind,
        sourceKind: row.source_kind === 'INSTITUTION' ? 'INSTITUTION' : row.source_kind === 'IMPORT' ? 'IMPORT' : 'TEACHER',
        sourceRef: row.source_ref,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    })

    return { versions, slots, exceptions }
  }
}
