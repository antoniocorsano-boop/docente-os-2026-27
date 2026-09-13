'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { teachingSessionCandidateFromOccurrence } from '@/core/application/teaching-session-candidate'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import { validateTeachingSessionAllocations, type TeachingSessionDraft } from '@/core/domain/teaching-session'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveHumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { hasCurrentBlockSessionOnDate, selectEligibleLessonOccurrence } from './lesson-registration-model'

export async function recordLessonTeachingSession(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const actualMinutes = positiveInt(formData, 'actualMinutes')
  const evidenceNote = optionalNote(formData.get('evidenceNote'))

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context?.academicYear) throw new Error('Active academic year required')

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const annual = await annualRepository.list(context.workspace.id, context.academicYear.id)
  const section = annual.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Section is outside the active annual plan')

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  if (!resolveHumanTaskLessonProjection(grade, block)) throw new Error('Human-task lesson projection is not available for this block')

  const source = CANONICAL_PLAN_SOURCES[grade]
  const localDate = currentRomeDate()
  const teachingRepository = new SupabaseTeachingSessionRepository()
  const temporalProjection = new TemporalProjectionService(
    new SupabaseTimetableProjectionReadRepository(),
    new SupabaseCalendarProjectionReadRepository(),
  )
  const [teaching, day] = await Promise.all([
    teachingRepository.listBySection(context.workspace.id, context.academicYear.id, sectionId),
    temporalProjection.projectDay({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      localDate,
    }),
  ])

  const occurrence = selectEligibleLessonOccurrence({
    occurrences: day.occurrences,
    teaching,
    sectionId,
    nowMinutes: currentRomeMinutes(),
  })

  if (!occurrence && hasCurrentBlockSessionOnDate({
    teaching,
    canonicalGenerationId: source.generationId,
    blockId,
    localDate,
  })) {
    throw new Error('Questa lezione risulta già registrata oggi. Apri la classe per correggere o aggiungere una sessione distinta.')
  }

  let session: TeachingSessionDraft
  if (occurrence) {
    session = {
      ...teachingSessionCandidateFromOccurrence(occurrence),
      actualMinutes,
      evidenceNote,
    }
  } else {
    session = {
      sectionId,
      disciplineId: null,
      localDate,
      plannedStartAt: null,
      plannedEndAt: null,
      plannedMinutes: null,
      actualMinutes,
      evidenceNote,
      source: {
        sourceKind: 'MANUAL',
        projectedOccurrenceLogicalId: null,
        timetableVersionId: null,
        timetableSlotId: null,
        calendarState: null,
        provenance: [`manual_session:${localDate}`, `section:${sectionId}`, `lesson_workspace:${blockId}`],
      },
    }
  }

  const allocations = [{
    blockId,
    minutes: actualMinutes,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
  }]
  const validation = validateTeachingSessionAllocations({
    session,
    allocations,
    context: {
      sectionId,
      canonicalPlanAssetId: source.assetId,
      canonicalGenerationId: source.generationId,
    },
  })
  if (!validation.valid) throw new Error(`Registrazione non valida: ${validation.codes.join(', ')}`)

  const receipt = await teachingRepository.record({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    session,
    allocations,
  })

  revalidatePath('/planner')
  revalidatePath('/piano-annuale')
  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)
  redirect(`/classi/${encodeURIComponent(sectionId)}?session=${encodeURIComponent(receipt)}`)
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}

function positiveInt(formData: FormData, name: string) {
  const value = Number(requiredText(formData, name))
  if (!Number.isInteger(value) || value <= 0 || value > 1440) throw new Error(`${name} invalid`)
  return value
}

function optionalNote(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null
  const note = value.trim()
  if (!note) return null
  if (note.length > 4000) throw new Error('Evidence note exceeds 4000 characters')
  return note
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function currentRomeMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(values.hour) * 60 + Number(values.minute)
}
