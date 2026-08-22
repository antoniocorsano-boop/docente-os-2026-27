import type { Database } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'
import {
  asTeachingAssignmentStatus,
  asTimetableSlotKind,
  asTimetableSourceKind,
  asTimetableVersionStatus,
  type TeachingAssignment,
  type TimetableSlot,
  type TimetableSlotKind,
  type TimetableT1Snapshot,
  type TimetableVersion,
} from '@/core/domain/timetable'

type AssignmentRow = Database['public']['Tables']['teaching_assignments']['Row']
type VersionRow = Database['public']['Tables']['timetable_versions']['Row']
type SlotRow = Database['public']['Tables']['timetable_slots']['Row']

export class SupabaseTimetableRepository {
  async getOrCreateDraft(
    workspaceId: string,
    academicYearId: string,
    effectiveFrom: string,
  ): Promise<TimetableVersion> {
    const supabase = await createClient()
    const { data: existing, error: existingError } = await supabase
      .from('timetable_versions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
      .eq('status', 'DRAFT')
      .limit(1)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)
    if (existing) return toVersion(existing)

    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('timetable_versions')
      .insert({
        workspace_id: workspaceId,
        academic_year_id: academicYearId,
        label: 'Orario iniziale',
        status: 'DRAFT',
        effective_from: effectiveFrom,
        source_kind: 'MANUAL',
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toVersion(data)
  }

  async list(
    workspaceId: string,
    academicYearId: string,
    effectiveFrom: string,
  ): Promise<TimetableT1Snapshot> {
    const draftVersion = await this.getOrCreateDraft(workspaceId, academicYearId, effectiveFrom)
    const supabase = await createClient()
    const [{ data: assignments, error: assignmentsError }, { data: slots, error: slotsError }] = await Promise.all([
      supabase
        .from('teaching_assignments')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('academic_year_id', academicYearId)
        .order('created_at'),
      supabase
        .from('timetable_slots')
        .select('*')
        .eq('timetable_version_id', draftVersion.id)
        .order('weekday')
        .order('start_time'),
    ])

    if (assignmentsError) throw new Error(assignmentsError.message)
    if (slotsError) throw new Error(slotsError.message)
    return {
      assignments: assignments.map(toAssignment),
      draftVersion,
      slots: slots.map(toSlot),
    }
  }

  async addAssignment(input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
    disciplineId: string
    weeklyMinutes: number
    sourceNote?: string | null
  }): Promise<TeachingAssignment> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('teaching_assignments')
      .insert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId,
        section_id: input.sectionId,
        discipline_id: input.disciplineId,
        weekly_minutes: normalizeWeeklyMinutes(input.weeklyMinutes),
        status: 'PROVISIONAL',
        source_note: normalizeNullable(input.sourceNote, 1000),
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toAssignment(data)
  }

  async updateAssignment(input: {
    workspaceId: string
    academicYearId: string
    assignmentId: string
    weeklyMinutes: number
    status: 'PROVISIONAL' | 'CONFIRMED'
  }): Promise<TeachingAssignment> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teaching_assignments')
      .update({
        weekly_minutes: normalizeWeeklyMinutes(input.weeklyMinutes),
        status: input.status,
      })
      .eq('id', input.assignmentId)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toAssignment(data)
  }

  async setAssignmentStatus(input: {
    workspaceId: string
    academicYearId: string
    assignmentId: string
    status: 'PROVISIONAL' | 'CONFIRMED'
  }): Promise<TeachingAssignment> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('teaching_assignments')
      .update({ status: input.status })
      .eq('id', input.assignmentId)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toAssignment(data)
  }

  async updateDraftVersion(input: {
    workspaceId: string
    academicYearId: string
    versionId: string
    label: string
    effectiveFrom: string
    sourceKind: 'MANUAL' | 'INSTITUTION_DOCUMENT' | 'IMPORT'
    sourceRef?: string | null
  }): Promise<TimetableVersion> {
    const supabase = await createClient()
    const label = input.label.trim()
    if (!label || label.length > 160) throw new Error('Timetable label required')
    const { data, error } = await supabase
      .from('timetable_versions')
      .update({
        label,
        effective_from: input.effectiveFrom,
        source_kind: input.sourceKind,
        source_ref: normalizeNullable(input.sourceRef, 1000),
      })
      .eq('id', input.versionId)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .eq('status', 'DRAFT')
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toVersion(data)
  }

  async addLessonSlot(input: {
    versionId: string
    assignmentId: string
    weekday: number
    startTime: string
    endTime: string
    ordinal?: number | null
    room?: string | null
    note?: string | null
  }): Promise<TimetableSlot> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const { data: assignment, error: assignmentError } = await supabase
      .from('teaching_assignments')
      .select('id, section_id, discipline_id')
      .eq('id', input.assignmentId)
      .single()
    if (assignmentError) throw new Error(assignmentError.message)

    const { data, error } = await supabase
      .from('timetable_slots')
      .insert({
        timetable_version_id: input.versionId,
        weekday: normalizeWeekday(input.weekday),
        start_time: normalizeTime(input.startTime),
        end_time: normalizeTime(input.endTime),
        slot_kind: 'LESSON',
        section_id: assignment.section_id,
        discipline_id: assignment.discipline_id,
        teaching_assignment_id: assignment.id,
        ordinal: normalizeOrdinal(input.ordinal),
        room: normalizeNullable(input.room, 80),
        note: normalizeNullable(input.note, 1000),
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toSlot(data)
  }

  async addSpecialSlot(input: {
    versionId: string
    kind: Exclude<TimetableSlotKind, 'LESSON'>
    weekday: number
    startTime: string
    endTime: string
    ordinal?: number | null
    note?: string | null
  }): Promise<TimetableSlot> {
    const supabase = await createClient()
    const userId = await authenticatedUserId(supabase)
    const { data, error } = await supabase
      .from('timetable_slots')
      .insert({
        timetable_version_id: input.versionId,
        weekday: normalizeWeekday(input.weekday),
        start_time: normalizeTime(input.startTime),
        end_time: normalizeTime(input.endTime),
        slot_kind: input.kind,
        ordinal: normalizeOrdinal(input.ordinal),
        note: normalizeNullable(input.note, 1000),
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toSlot(data)
  }

  async deleteSlot(versionId: string, slotId: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('timetable_slots')
      .delete()
      .eq('id', slotId)
      .eq('timetable_version_id', versionId)
    if (error) throw new Error(error.message)
  }
}

async function authenticatedUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) throw new Error('Authenticated user required')
  return userId
}

function toAssignment(row: AssignmentRow): TeachingAssignment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    sectionId: row.section_id,
    disciplineId: row.discipline_id,
    weeklyMinutes: row.weekly_minutes,
    status: asTeachingAssignmentStatus(row.status),
    sourceNote: row.source_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    room: row.room,
    note: row.note,
    ordinal: row.ordinal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeWeeklyMinutes(value: number) {
  if (!Number.isInteger(value) || value < 30 || value > 2400) throw new Error('Weekly minutes out of range')
  return value
}

function normalizeWeekday(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error('Weekday out of range')
  return value
}

function normalizeOrdinal(value?: number | null) {
  if (value == null) return null
  if (!Number.isInteger(value) || value < 1 || value > 20) throw new Error('Ordinal out of range')
  return value
}

function normalizeTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid time')
  return value
}

function normalizeNullable(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim() ?? ''
  if (normalized.length > maxLength) throw new Error(`Value exceeds ${maxLength} characters`)
  return normalized || null
}
