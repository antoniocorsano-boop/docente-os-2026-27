'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { recordTeachingSession as recordTeachingSessionCommand } from '@/core/application/record-teaching-session'
import { teachingSessionCandidateFromOccurrence } from '@/core/application/teaching-session-candidate'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import {
  allocatedMinutesByBlock,
  currentTeachingSessions,
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
  const localDate = validTeachingLocalDate(formData, 'localDate')
  const occurrenceLogicalId = nullableText(formData, 'occurrenceLogicalId')
  const registrationKey = validRegistrationKey(formData, 'registrationKey')
  const actualMinutes = positiveInt(formData, 'actualMinutes')
  const evidenceNote = boundedNote(formData, 'evidenceNote', 4000)

  const annual = new SupabaseAnnualPlanExecutionRepository()
  const teachingRepository = new SupabaseTeachingSessionRepository()
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

  const teaching = await teachingRepository.listBySection(
    context.workspace.id,
    context.academicYear.id,
    sectionId,
  )
  const currentSessions = currentTeachingSessions(teaching)
  const registrationKeyProvenance = `registration_key:${registrationKey}`
  const recordedOccurrenceIds = new Set(
    currentSessions
      .map((item) => item.source.projectedOccurrenceLogicalId)
      .filter((value): value is string => Boolean(value)),
  )

  const projection = new TemporalProjectionService(
    new SupabaseTimetableProjectionReadRepository(),
    new SupabaseCalendarProjectionReadRepository(),
  )
  const day = await projection.projectDay({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    localDate,
  })
  const classOccurrences = day.occurrences.filter(
    (item) => item.sectionId === sectionId && (item.kind === 'LESSON' || item.kind === 'CLASS_PRESENCE'),
  )

  let resolvedOccurrence = null
  if (occurrenceLogicalId) {
    if (recordedOccurrenceIds.has(occurrenceLogicalId)) {
      throw new Error('La lezione prevista risulta già registrata')
    }
    resolvedOccurrence = classOccurrences.find((item) => item.logicalId === occurrenceLogicalId) ?? null
    if (!resolvedOccurrence) throw new Error('La lezione prevista non è più valida per questa data')
  } else {
    const unrecordedOccurrences = classOccurrences.filter((item) => !recordedOccurrenceIds.has(item.logicalId))
    if (unrecordedOccurrences.length > 1) {
      throw new Error('Più lezioni trovate per questa data: apri la lezione dall’Orario o dal Calendario per scegliere quella corretta')
    }
    resolvedOccurrence = unrecordedOccurrences[0] ?? null
  }

  let session: TeachingSessionDraft
  if (resolvedOccurrence) {
    const projectedCandidate = teachingSessionCandidateFromOccurrence(resolvedOccurrence)
    session = {
      ...projectedCandidate,
      actualMinutes,
      evidenceNote,
      source: {
        ...projectedCandidate.source,
        provenance: [...projectedCandidate.source.provenance, registrationKeyProvenance],
      },
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
        provenance: [`manual_session:${localDate}`, `section:${sectionId}`, registrationKeyProvenance],
      },
    }
  }

  // Always cross the authoritative RPC boundary, including retries. Migration 0052
  // validates the complete payload signature and resolves the registration key
  // atomically, so concurrent submissions cannot create duplicate sessions.
  const receipt = await recordTeachingSessionCommand({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    session,
    allocations,
    allocationContext: {
      sectionId,
      canonicalPlanAssetId: source.assetId,
      canonicalGenerationId: source.generationId,
    },
  }, teachingRepository)

  revalidatePath('/planner')
  revalidatePath('/piano-annuale')
  revalidatePath(`/classi/${sectionId}`)
  redirect(`/classi/${encodeURIComponent(sectionId)}?session=${encodeURIComponent(receipt.teachingSessionId)}`)
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

function validTeachingLocalDate(formData: FormData, key: string) {
  const value = requiredText(formData, key)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${key} non valido`)
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw new Error(`${key} non valido`)
  }
  if (value > currentRomeDate()) throw new Error('Non puoi registrare una lezione futura')
  return value
}

function validRegistrationKey(formData: FormData, key: string) {
  const value = requiredText(formData, key)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${key} non valido`)
  }
  return value
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
