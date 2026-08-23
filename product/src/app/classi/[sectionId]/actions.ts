'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { teachingSessionCandidateFromOccurrence } from '@/core/application/teaching-session-candidate'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import {
  allocatedMinutesByBlock,
  currentTeachingSessions,
  validateTeachingSessionAllocations,
  type TeachingSessionDraft,
} from '@/core/domain/teaching-session'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'

export async function recordTeachingSession(formData: FormData) {
  const context = await requireContext()
  const sectionId = requiredText(formData, 'sectionId')
  const localDate = requiredText(formData, 'localDate')
  const occurrenceLogicalId = nullableText(formData, 'occurrenceLogicalId')
  const actualMinutes = positiveInt(formData, 'actualMinutes')
  const evidenceNote = boundedNote(formData, 'evidenceNote', 4000)

  const annual = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await annual.list(context.workspace.id, context.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Classe fuori dal contesto attivo')

  const grade = GRADE_UI[section.grade]
  const source = CANONICAL_PLAN_SOURCES[grade]
  const blocks = buildBlocks(grade)
  const allocations = allocationInputs(formData).map((allocation) => {
    if (!blocks.some((block) => block.id === allocation.blockId)) throw new Error('Blocco fuori dal Piano annuale della classe')
    return {
      blockId: allocation.blockId,
      minutes: allocation.minutes,
      canonicalPlanAssetId: source.assetId,
      canonicalGenerationId: source.generationId,
    }
  })

  let session: TeachingSessionDraft
  if (occurrenceLogicalId) {
    const projection = new TemporalProjectionService(
      new SupabaseTimetableProjectionReadRepository(),
      new SupabaseCalendarProjectionReadRepository(),
    )
    const day = await projection.projectDay({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      localDate,
    })
    const occurrence = day.occurrences.find((item) => item.logicalId === occurrenceLogicalId && item.sectionId === sectionId)
    if (!occurrence) throw new Error('La lezione prevista non è più valida per questa data')
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
        provenance: [`manual_session:${localDate}`, `section:${sectionId}`],
      },
    }
  }

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

  const repository = new SupabaseTeachingSessionRepository()
  const receipt = await repository.record({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    session,
    allocations,
  })

  revalidatePath('/planner')
  revalidatePath('/piano-annuale')
  revalidatePath(`/classi/${sectionId}`)
  redirect(`/classi/${encodeURIComponent(sectionId)}?session=${encodeURIComponent(receipt)}`)
}

export async function confirmTeachingBlockCompletion(formData: FormData) {
  const context = await requireContext()
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId')
  const note = boundedNote(formData, 'note', 4000)

  const annual = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await annual.list(context.workspace.id, context.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Classe fuori dal contesto attivo')

  const grade = GRADE_UI[section.grade]
  const source = CANONICAL_PLAN_SOURCES[grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Blocco fuori dal Piano annuale della classe')

  const teaching = await new SupabaseTeachingSessionRepository().listBySection(
    context.workspace.id,
    context.academicYear.id,
    sectionId,
  )
  const totals = allocatedMinutesByBlock(teaching, source.generationId)
  const allocatedMinutes = totals.get(blockId) ?? 0
  const plannedMinutes = block.hours * 60
  if (allocatedMinutes < plannedMinutes) throw new Error('Il monte minuti registrato non ha ancora raggiunto il blocco previsto')

  const currentSessions = currentTeachingSessions(teaching)
  const sessionIdsForBlock = new Set(
    teaching.allocations
      .filter((allocation) => allocation.blockId === blockId && allocation.canonicalGenerationId === source.generationId)
      .map((allocation) => allocation.sessionId),
  )
  const latestDate = currentSessions
    .filter((session) => sessionIdsForBlock.has(session.id))
    .map((session) => session.localDate)
    .sort()
    .at(-1) ?? null

  await annual.saveProgress({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId,
    status: 'SVOLTO',
    executedOn: latestDate,
    evidenceNote: note ?? `Completamento confermato dal docente dopo ${allocatedMinutes} minuti effettivi registrati in TeachingSession.`,
  })

  revalidatePath('/planner')
  revalidatePath('/piano-annuale')
  revalidatePath(`/classi/${sectionId}`)
  redirect(`/classi/${encodeURIComponent(sectionId)}?recorded=${encodeURIComponent(blockId)}`)
}

async function requireContext() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) throw new Error('Spazio autenticato richiesto')
  if (!context.academicYear) throw new Error('Anno scolastico attivo richiesto')
  return { ...context, academicYear: context.academicYear }
}

function allocationInputs(formData: FormData) {
  const first = {
    blockId: requiredText(formData, 'blockId1').toUpperCase(),
    minutes: positiveInt(formData, 'minutes1'),
  }
  const secondBlock = nullableText(formData, 'blockId2')?.toUpperCase() ?? null
  const secondMinutes = nullablePositiveInt(formData, 'minutes2')
  if (!secondBlock && !secondMinutes) return [first]
  if (!secondBlock || !secondMinutes) throw new Error('Seconda allocazione incompleta')
  return [first, { blockId: secondBlock, minutes: secondMinutes }]
}

function requiredText(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} richiesto`)
  return value.trim()
}

function nullableText(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') return null
  return value.trim() || null
}

function positiveInt(formData: FormData, key: string) {
  const value = Number(requiredText(formData, key))
  if (!Number.isInteger(value) || value <= 0 || value > 1440) throw new Error(`${key} non valido`)
  return value
}

function nullablePositiveInt(formData: FormData, key: string) {
  const raw = nullableText(formData, key)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0 || value > 1440) throw new Error(`${key} non valido`)
  return value
}

function boundedNote(formData: FormData, key: string, max: number) {
  const value = nullableText(formData, key)
  if (value && value.length > max) throw new Error(`${key} troppo lungo`)
  return value
}
