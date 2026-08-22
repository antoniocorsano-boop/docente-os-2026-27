import { createClient } from '@/lib/supabase/server'
import type { TimetablePresenceKind, TimetableSlotKind } from '@/core/domain/timetable'

export async function updateDraftTimetableSlot(input: {
  versionId: string
  slotId: string
  kind: TimetableSlotKind
  assignmentId?: string | null
  manualClassLabel?: string | null
  presenceKind?: TimetablePresenceKind | null
  weekday: number
  startTime: string
  endTime: string
  ordinal?: number | null
  room?: string | null
  note?: string | null
}) {
  const supabase = await createClient()
  let sectionId: string | null = null
  let disciplineId: string | null = null
  let teachingAssignmentId: string | null = null

  if (input.kind === 'LESSON') {
    if (!input.assignmentId) throw new Error('Lesson slot requires a teaching assignment')
    const { data: assignment, error: assignmentError } = await supabase
      .from('teaching_assignments')
      .select('id, section_id, discipline_id')
      .eq('id', input.assignmentId)
      .single()
    if (assignmentError) throw new Error(assignmentError.message)
    sectionId = assignment.section_id
    disciplineId = assignment.discipline_id
    teachingAssignmentId = assignment.id
  }

  const presence = input.kind === 'CLASS_PRESENCE'
  const updatePayload: DatabaseSlotUpdateWithPresence = {
    weekday: normalizeWeekday(input.weekday),
    start_time: normalizeTime(input.startTime),
    end_time: normalizeTime(input.endTime),
    slot_kind: input.kind,
    section_id: sectionId,
    discipline_id: disciplineId,
    teaching_assignment_id: teachingAssignmentId,
    manual_class_label: presence ? normalizeClassLabel(input.manualClassLabel) : null,
    presence_kind: presence ? requirePresenceKind(input.presenceKind) : null,
    ordinal: normalizeOrdinal(input.ordinal),
    room: input.kind === 'LESSON' || presence ? normalizeNullable(input.room, 80) : null,
    note: normalizeNullable(input.note, 1000),
  }

  const { error } = await supabase
    .from('timetable_slots')
    .update(updatePayload)
    .eq('id', input.slotId)
    .eq('timetable_version_id', input.versionId)

  if (error) throw new Error(error.message)
}

type DatabaseSlotUpdateWithPresence = {
  weekday: number
  start_time: string
  end_time: string
  slot_kind: TimetableSlotKind
  section_id: string | null
  discipline_id: string | null
  teaching_assignment_id: string | null
  manual_class_label: string | null
  presence_kind: TimetablePresenceKind | null
  ordinal: number | null
  room: string | null
  note: string | null
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
  const match = value.match(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
  if (!match) throw new Error('Invalid time')
  return value
}

function normalizeClassLabel(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, '').toUpperCase() ?? ''
  if (!normalized || normalized.length > 12) throw new Error('Class label required')
  return normalized
}

function requirePresenceKind(value?: TimetablePresenceKind | null): TimetablePresenceKind {
  if (value === 'SUBSTITUTION' || value === 'CO_TEACHING' || value === 'SUPERVISION' || value === 'PROJECT' || value === 'OTHER') return value
  throw new Error('Presence kind required')
}

function normalizeNullable(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim() ?? ''
  if (normalized.length > maxLength) throw new Error(`Value exceeds ${maxLength} characters`)
  return normalized || null
}
