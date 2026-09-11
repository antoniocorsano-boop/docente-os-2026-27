'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import { teachingSessionCandidateFromOccurrence } from '@/core/application/teaching-session-candidate'
import {
  buildDriveDiaryProjection,
  buildDriveDiaryRecordId,
  buildTeachingSessionEvidenceNote,
  normalizeTeachingSessionReflection,
} from '@/core/domain/teaching-session-reflection'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'
import { synchronizeDriveDiaryReceipt } from '@/core/infrastructure/google/google-drive-diary-sync'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeachingSessionDriveOutboxRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-drive-outbox-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildClassroomSessionView } from '../classroom-session-model'

export async function recordClassroomLesson(formData: FormData) {
  const sectionId = requiredText(formData, 'sectionId')
  const assetId = requiredText(formData, 'assetId')
  const actualMinutes = requiredInteger(formData, 'actualMinutes', 1, 1440)
  const reflection = normalizeTeachingSessionReflection({
    activityDone: requiredText(formData, 'activityDone'),
    observations: optionalText(formData, 'observations'),
    difficulties: optionalText(formData, 'difficulties'),
    ideas: optionalText(formData, 'ideas'),
    udaChangeProposal: optionalText(formData, 'udaChangeProposal'),
    nextActivity: optionalText(formData, 'nextActivity'),
  })

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context?.academicYear) throw new Error('Active academic year required')

  const [snapshot, bundle] = await Promise.all([
    new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id),
    new SupabaseKnowledgeRepository().getBundle(context.workspace.id, assetId),
  ])
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section || !bundle) throw new Error('Classroom material is outside the active class context')
  const view = buildClassroomSessionView(section, bundle.asset)
  if (!view) throw new Error('Classroom material is not a valid lesson resource for this class')

  const localDate = view.targetDate ?? currentRomeDate()
  const occurrence = await projectedTeachingOccurrence({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    localDate,
  })

  const candidate = occurrence
    ? teachingSessionCandidateFromOccurrence(occurrence)
    : manualCandidate(sectionId, localDate)
  const recordId = buildDriveDiaryRecordId({
    localDate,
    classLabel: view.classLabel,
    plannedStartAt: candidate.plannedStartAt,
  })
  const evidenceNote = buildTeachingSessionEvidenceNote({
    reflection,
    materialAssetId: view.assetId,
    driveRecordId: recordId,
  })

  const session: TeachingSessionDraft = {
    ...candidate,
    actualMinutes,
    evidenceNote,
  }

  // Recording the lesson never invents a B01-B33 allocation. Diagnostic and
  // pre-canonical sessions are valid evidence; canonical progress remains a
  // separate teacher-confirmed decision.
  const sessionId = await new SupabaseTeachingSessionRepository().record({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    session,
    allocations: [],
  })

  const projection = buildDriveDiaryProjection({
    localDate,
    plannedStartAt: candidate.plannedStartAt,
    startTime: null,
    classLabel: view.classLabel,
    disciplineLabel: disciplineLabel(occurrence?.title, bundle.asset.disciplines),
    actualMinutes,
    udaLabel: metadataString(bundle.asset.sourceMetadata, 'udaLabel') ?? metadataString(bundle.asset.sourceMetadata, 'udaTitle'),
    udaPhase: metadataString(bundle.asset.sourceMetadata, 'udaPhase'),
    plannedActivity: metadataString(bundle.asset.sourceMetadata, 'plannedActivity') ?? view.title,
    reflection,
    materialHref: null,
    assessmentLabel: metadataString(bundle.asset.sourceMetadata, 'assessmentLabel'),
    curriculumLink: metadataString(bundle.asset.sourceMetadata, 'curriculumLink'),
  })

  let driveState: 'synced' | 'connect' | 'not-configured' | 'recoverable' = 'recoverable'
  try {
    const outboxId = await new SupabaseTeachingSessionDriveOutboxRepository().queue({
      sessionId,
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sectionId,
      recordId,
      projection,
    })
    const syncState = await synchronizeDriveDiaryReceipt({
      outboxId,
      workspaceId: context.workspace.id,
      projection,
    })
    driveState = syncState === 'SYNCED'
      ? 'synced'
      : syncState === 'NOT_CONNECTED'
        ? 'connect'
        : syncState === 'NOT_CONFIGURED'
          ? 'not-configured'
          : 'recoverable'
  } catch {
    // The canonical TeachingSession already contains the recoverable reflection
    // and deterministic Drive record id. Never roll back classroom evidence
    // because the documentary projection is temporarily unavailable.
    driveState = 'recoverable'
  }

  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/in-classe/${assetId}`)
  revalidatePath(`/classi/${sectionId}/in-classe/${assetId}/registra`)
  redirect(
    `/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}/registra?saved=${encodeURIComponent(sessionId)}&drive=${driveState}`,
  )
}

async function projectedTeachingOccurrence(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  localDate: string
}) {
  try {
    const day = await new TemporalProjectionService(
      new SupabaseTimetableProjectionReadRepository(),
      new SupabaseCalendarProjectionReadRepository(),
    ).projectDay(input)
    return day.occurrences.find((item) =>
      item.sectionId === input.sectionId && (item.kind === 'LESSON' || item.kind === 'CLASS_PRESENCE'),
    ) ?? null
  } catch {
    return null
  }
}

function manualCandidate(sectionId: string, localDate: string): Omit<TeachingSessionDraft, 'actualMinutes' | 'evidenceNote'> {
  return {
    sectionId,
    disciplineId: null,
    localDate,
    plannedStartAt: null,
    plannedEndAt: null,
    plannedMinutes: null,
    source: {
      sourceKind: 'MANUAL',
      projectedOccurrenceLogicalId: null,
      timetableVersionId: null,
      timetableSlotId: null,
      calendarState: null,
      provenance: ['classroom_register:fallback_manual'],
    },
  }
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}

function optionalText(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function requiredInteger(formData: FormData, name: string, min: number, max: number) {
  const raw = requiredText(formData, name)
  const value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} invalid`)
  return value
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 600) : null
}

function disciplineLabel(occurrenceTitle: string | undefined, disciplines: string[]) {
  const fromOccurrence = occurrenceTitle?.split('·').map((item) => item.trim()).filter(Boolean).at(-1)
  return fromOccurrence || disciplines[0] || 'Disciplina'
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
