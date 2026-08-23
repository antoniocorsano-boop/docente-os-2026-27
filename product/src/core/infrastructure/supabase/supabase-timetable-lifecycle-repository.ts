import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import {
  asTimetablePresenceKind,
  asTimetableSlotKind,
  asTimetableSourceKind,
  asTimetableVersionStatus,
  type TimetableSlot,
  type TimetableVersion,
} from '@/core/domain/timetable'

type VersionRow = Database['public']['Tables']['timetable_versions']['Row']
type SlotRow = Database['public']['Tables']['timetable_slots']['Row']
type SlotRowWithPresence = SlotRow & { manual_class_label: string | null; presence_kind: string | null }

export type TimetableLifecycleSnapshot = {
  activeVersion: TimetableVersion | null
  activeSlots: TimetableSlot[]
  versions: TimetableVersion[]
}

type ActivationRow = {
  active_version_id: string
  archived_version_id: string | null
  next_draft_version_id: string
}

type TimetableLifecycleRpcClient = {
  rpc: (
    name: 'activate_timetable_version',
    args: { p_version_id: string },
  ) => Promise<{ data: ActivationRow[] | null; error: { message: string } | null }>
}

export class SupabaseTimetableLifecycleRepository {
  async read(workspaceId: string, academicYearId: string): Promise<TimetableLifecycleSnapshot> {
    const supabase = await createClient()
    const { data: versions, error: versionsError } = await supabase
      .from('timetable_versions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false })

    if (versionsError) throw new Error(versionsError.message)

    const mappedVersions = versions.map(toVersion)
    const activeVersion = mappedVersions.find((version) => version.status === 'ACTIVE') ?? null
    if (!activeVersion) return { activeVersion: null, activeSlots: [], versions: mappedVersions }

    const { data: slots, error: slotsError } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('timetable_version_id', activeVersion.id)
      .order('weekday')
      .order('start_time')

    if (slotsError) throw new Error(slotsError.message)
    return { activeVersion, activeSlots: slots.map(toSlot), versions: mappedVersions }
  }

  async activateDraft(versionId: string) {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as TimetableLifecycleRpcClient).rpc(
      'activate_timetable_version',
      { p_version_id: versionId },
    )

    if (error) throw new Error(error.message)
    const result = data?.[0]
    if (!result) throw new Error('Timetable activation returned no result')
    return {
      activeVersionId: result.active_version_id,
      archivedVersionId: result.archived_version_id,
      nextDraftVersionId: result.next_draft_version_id,
    }
  }
}

function toVersion(row: VersionRow): TimetableVersion {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    label: row.label,
    status: asTimetableVersionStatus(row.status),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    sourceKind: asTimetableSourceKind(row.source_kind),
    sourceRef: row.source_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toSlot(row: SlotRow): TimetableSlot {
  const extended = row as SlotRowWithPresence
  return {
    id: row.id,
    timetableVersionId: row.timetable_version_id,
    weekday: row.weekday,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    slotKind: asTimetableSlotKind(row.slot_kind),
    sectionId: row.section_id,
    disciplineId: row.discipline_id,
    teachingAssignmentId: row.teaching_assignment_id,
    manualClassLabel: extended.manual_class_label,
    presenceKind: asTimetablePresenceKind(extended.presence_kind),
    room: row.room,
    note: row.note,
    ordinal: row.ordinal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
