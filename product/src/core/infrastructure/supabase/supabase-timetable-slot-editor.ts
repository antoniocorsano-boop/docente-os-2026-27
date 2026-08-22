import { createClient } from '@/lib/supabase/server'
import type { TimetableSlotKind } from '@/core/domain/timetable'

export async function updateDraftTimetableSlot(input: {
  versionId: string
  slotId: string
  kind: TimetableSlotKind
  assignmentId?: string | null
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

  const { error } = await supabase
    .from('timetable_slots')
    .update({
      weekday: normalizeWeekday(input.weekday),
      start_time: normalizeTime(input.startTime),
      end_time: normalizeTime(input.endTime),
      slot_kind: input.kind,
      section_id: sectionId,
      discipline_id: disciplineId,
      teaching_assignment_id: teachingAssignmentId,
      ordinal: normalizeOrdinal(input.ordinal),
      room: input.kind === 'LESSON' ? normalizeNullable(input.room, 80) : null,
      note: normalizeNullable(input.note, 1000),
    })
    .eq('id', input.slotId)
    .eq('timetable_version_id', input.versionId)

  if (error) throw new Error(error.message)
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

function normalizeNullable(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim() ?? ''
  if (normalized.length > maxLength) throw new Error(`Value exceeds ${maxLength} characters`)
  return normalized || null
}
