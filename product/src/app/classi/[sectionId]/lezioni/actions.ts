'use server'

import { revalidatePath } from 'next/cache'
import { recordTeachingSession } from '@/core/application/record-teaching-session'
import { recordTeachingSessionWithEvidence } from '@/core/application/record-teaching-session-with-evidence'
import { teachingSessionCandidateFromOccurrence } from '@/core/application/teaching-session-candidate'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import { buildTeachingSessionEvidenceNote } from '@/core/domain/teaching-session-reflection'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseTeachingEvidenceRepository } from '@/core/infrastructure/supabase/supabase-teaching-evidence-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { normalizeLessonObservationDraft, toTeachingObservationDraft } from './lesson-observation-model'
import { hasCurrentBlockSessionOnDate, selectEligibleLessonOccurrence } from './lesson-registration-model'

export async function recordLessonExecution(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const localDate = requiredDate(formData, 'localDate')
  const actualMinutes = positiveInt(formData, 'actualMinutes')
  const registrationKey = requiredUuid(formData, 'registrationKey')
  const freeEvidenceNote = optionalNote(formData.get('evidenceNote'))
  const nextActivity = optionalReflectionField(formData.get('nextActivity'), 'Next activity')
  const udaChangeProposal = optionalReflectionField(formData.get('udaChangeProposal'), 'UDA change proposal')
  const observationDraft = normalizeLessonObservationDraft({
    dimensionKey: formData.get('observationDimension'),
    state: formData.get('observationState'),
    note: formData.get('observationNote'),
  })
  const today = currentRomeDate()

  if (localDate > today) throw new Error('Teaching session date cannot be in the future')

  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context?.academicYear) throw new Error('Active academic year required')

  const annual = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await annual.list(context.workspace.id, context.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) throw new Error('Section is outside the active annual plan')

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection) throw new Error('Human-task lesson projection is not available for this block')

  const evidenceNote = nextActivity || udaChangeProposal
    ? buildTeachingSessionEvidenceNote({
        reflection: {
          activityDone: projection.title,
          observations: freeEvidenceNote ?? '',
          difficulties: '',
          ideas: '',
          udaChangeProposal: udaChangeProposal ?? '',
          nextActivity: nextActivity ?? '',
        },
      })
    : freeEvidenceNote

  const source = CANONICAL_PLAN_SOURCES[grade]
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
    nowMinutes: localDate === today ? currentRomeMinutes() : 24 * 60,
  })

  if (!occurrence && hasCurrentBlockSessionOnDate({
    teaching,
    canonicalGenerationId: source.generationId,
    blockId,
    localDate,
  })) {
    throw new Error('Questa lezione risulta già registrata per la data indicata. Apri la classe per correggere o aggiungere una sessione distinta.')
  }

  let session: TeachingSessionDraft
  if (occurrence) {
    const candidate = teachingSessionCandidateFromOccurrence(occurrence)
    session = {
      ...candidate,
      actualMinutes,
      evidenceNote,
      source: {
        ...candidate.source,
        provenance: [
          ...candidate.source.provenance,
          `lesson_workspace:${sectionId}:${blockId}`,
          `canonical_generation:${source.generationId}`,
          `registration_key:${registrationKey}`,
        ],
      },
    }
  } else {
    session = {
      sectionId,
      disciplineId: null,
      localDate,
      plannedStartAt: null,
      plannedEndAt: null,
      plannedMinutes: projection.durationMinutes,
      actualMinutes,
      evidenceNote,
      source: {
        sourceKind: 'MANUAL',
        projectedOccurrenceLogicalId: null,
        timetableVersionId: null,
        timetableSlotId: null,
        calendarState: null,
        provenance: [
          `manual_session:${localDate}`,
          `section:${sectionId}`,
          `lesson_workspace:${sectionId}:${blockId}`,
          `canonical_generation:${source.generationId}`,
          `registration_key:${registrationKey}`,
        ],
      },
    }
  }

  const allocations = [{
    blockId,
    minutes: actualMinutes,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
  }]
  const allocationContext = {
    sectionId,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
  }

  const receipt = observationDraft
    ? await recordTeachingSessionWithEvidence({
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
        session,
        allocations,
        allocationContext,
        observations: [toTeachingObservationDraft(observationDraft, blockId)],
        evidenceReferences: [],
      }, new SupabaseTeachingEvidenceRepository())
    : await recordTeachingSession({
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
        session,
        allocations,
        allocationContext,
      }, teachingRepository)

  revalidatePath('/planner')
  revalidatePath('/piano-annuale')
  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/diario`)
  revalidatePath(`/classi/${sectionId}/lezioni/${blockId}`)

  return {
    teachingSessionId: receipt.teachingSessionId,
    observationCount: observationDraft ? 1 : 0,
  }
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}

function requiredDate(formData: FormData, name: string) {
  const value = requiredText(formData, name)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} invalid`)
  return value
}

function requiredUuid(formData: FormData, name: string) {
  const value = requiredText(formData, name).toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) {
    throw new Error(`${name} invalid`)
  }
  return value
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

function optionalReflectionField(value: FormDataEntryValue | null, label: string) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (text.length > 450) throw new Error(`${label} exceeds 450 characters`)
  return text
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
