'use server'

import { revalidatePath } from 'next/cache'
import { updateDraftTimetableSlot } from '@/core/infrastructure/supabase/supabase-timetable-slot-editor'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import type { TimetablePresenceKind } from '@/core/domain/timetable'

export async function addTeachingAssignment(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.addAssignment({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: text(formData, 'sectionId'),
    disciplineId: text(formData, 'disciplineId'),
    weeklyMinutes: integer(formData, 'weeklyMinutes'),
    sourceNote: nullableText(formData, 'sourceNote'),
  })
  revalidatePath('/orario')
}

export async function updateTeachingAssignment(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.updateAssignment({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    assignmentId: text(formData, 'assignmentId'),
    weeklyMinutes: integer(formData, 'weeklyMinutes'),
    status: text(formData, 'status') === 'CONFIRMED' ? 'CONFIRMED' : 'PROVISIONAL',
  })
  revalidatePath('/orario')
}

export async function updateTimetableDraft(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.updateDraftVersion({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    versionId: text(formData, 'versionId'),
    label: text(formData, 'label'),
    effectiveFrom: text(formData, 'effectiveFrom'),
    sourceKind: sourceKind(text(formData, 'sourceKind')),
    sourceRef: nullableText(formData, 'sourceRef'),
  })
  revalidatePath('/orario')
}

export async function addLessonSlot(formData: FormData) {
  await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.addLessonSlot({
    versionId: text(formData, 'versionId'),
    assignmentId: text(formData, 'assignmentId'),
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    room: nullableText(formData, 'room'),
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function addClassPresenceSlot(formData: FormData) {
  await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.addClassPresenceSlot({
    versionId: text(formData, 'versionId'),
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    manualClassLabel: text(formData, 'manualClassLabel'),
    presenceKind: presenceKind(text(formData, 'presenceKind')),
    room: nullableText(formData, 'room'),
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function addSpecialSlot(formData: FormData) {
  await requireContext()
  const kindValue = text(formData, 'kind')
  if (kindValue !== 'DISPOSITION' && kindValue !== 'RECEPTION' && kindValue !== 'OTHER') {
    throw new Error('Unsupported special slot kind')
  }
  const repository = new SupabaseTimetableRepository()
  await repository.addSpecialSlot({
    versionId: text(formData, 'versionId'),
    kind: kindValue,
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function updateTimetableSlot(formData: FormData) {
  await requireContext()
  const kind = timetableSlotKind(text(formData, 'kind'))
  await updateDraftTimetableSlot({
    versionId: text(formData, 'versionId'),
    slotId: text(formData, 'slotId'),
    kind,
    assignmentId: kind === 'LESSON' ? text(formData, 'assignmentId') : null,
    manualClassLabel: kind === 'CLASS_PRESENCE' ? text(formData, 'manualClassLabel') : null,
    presenceKind: kind === 'CLASS_PRESENCE' ? presenceKind(text(formData, 'presenceKind')) : null,
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    room: kind === 'LESSON' || kind === 'CLASS_PRESENCE' ? nullableText(formData, 'room') : null,
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function deleteTimetableSlot(formData: FormData) {
  await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.deleteSlot(text(formData, 'versionId'), text(formData, 'slotId'))
  revalidatePath('/orario')
}

async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') throw new Error(`${key} required`)
  return value
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key).trim()
  return value || null
}

function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key))
  if (!Number.isInteger(value)) throw new Error(`${key} must be an integer`)
  return value
}

function optionalInteger(formData: FormData, key: string) {
  const raw = text(formData, key).trim()
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isInteger(value)) throw new Error(`${key} must be an integer`)
  return value
}

function sourceKind(value: string) {
  if (value === 'MANUAL' || value === 'INSTITUTION_DOCUMENT' || value === 'IMPORT') return value
  throw new Error('Unsupported source kind')
}

function timetableSlotKind(value: string) {
  if (value === 'LESSON' || value === 'CLASS_PRESENCE' || value === 'DISPOSITION' || value === 'RECEPTION' || value === 'OTHER') return value
  throw new Error('Unsupported timetable slot kind')
}

function presenceKind(value: string): TimetablePresenceKind {
  if (value === 'SUBSTITUTION' || value === 'CO_TEACHING' || value === 'SUPERVISION' || value === 'PROJECT' || value === 'OTHER') return value
  throw new Error('Unsupported presence kind')
}
