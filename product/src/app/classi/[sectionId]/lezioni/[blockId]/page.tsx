import { randomUUID } from 'node:crypto'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { TemporalProjectionService, type ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import { isVoiceCaptureReady } from '@/core/application/voice/voice-capture-policy'
import {
  buildLessonPreparationApprovalSnapshot,
  isCurriculumBaselineReadyForLessonApproval,
  lessonPreparationFingerprint,
  type LessonPreparationApprovalStatus,
} from '@/core/application/lesson-preparation-approval'
import { SupabaseAnnualPlanCurriculumRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseLessonPreparationApprovalRepository } from '@/core/infrastructure/supabase/supabase-lesson-preparation-approval-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseTextbookRepository } from '@/core/infrastructure/supabase/supabase-textbook-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { resolveLessonWorkspaceState, type LessonWorkspaceIntent, type LessonWorkspaceResolvedState } from '@/core/presentation/lesson-workspace-state'
import LessonPrepareClient from './lesson-prepare-client'
import LessonLiveClient from './lesson-live-client'
import LessonObserveClient from './lesson-observe-client'
import LessonCloseClient from './lesson-close-client'
import { buildLessonMaterialSuggestions } from './lesson-material-suggestions'
import { activeAtlasMaterialIds, buildAtlasLessonSuggestions } from './atlas-material-suggestions'
import { OpenDesignReview } from './open-design-review'
import { LessonShell } from './lesson-shell'
import lessonStyles from './lesson-live.module.css'
import './lesson-workspace.css'
import './lesson-design-tools.css'

export const dynamic = 'force-dynamic'

type LegacyLessonWorkspaceMode = 'prepare' | 'teach' | 'observe' | 'record'
type LessonWorkspaceSubtask = 'observe' | 'materials' | null

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const
const GRADE_QUERY = { PRIMA: 'prima', SECONDA: 'seconda', TERZA: 'terza' } as const
const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export default async function LessonWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; blockId: string }>
  searchParams: Promise<{ date?: string; occurrence?: string; intent?: string; subtask?: string; mode?: string; review?: string; approval?: string }>
}) {
  const { sectionId, blockId: rawBlockId } = await params
  const blockId = rawBlockId.toUpperCase()
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const repository = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await repository.list(context.workspace.id, context.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()

  const grade = GRADE_UI[section.grade]
  const blocks = buildBlocks(grade)
  const block = blocks.find((item) => item.id === blockId)
  if (!block) notFound()
  const blockIndex = blocks.findIndex((item) => item.id === block.id)
  const nextBlockId = blockIndex >= 0 ? blocks[blockIndex + 1]?.id ?? null : null

  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection) {
    const gradeQuery = GRADE_QUERY[section.grade]
    redirect(`/progetta?grade=${gradeQuery}&section=${encodeURIComponent(section.id)}&block=${encodeURIComponent(block.id)}&uda=${encodeURIComponent(block.uda)}&pack=${encodeURIComponent(block.pack)}#focus-operativo`)
  }

  const source = CANONICAL_PLAN_SOURCES[grade]
  const runtimeSource = await new SupabaseCanonicalPlanSourceRepository().resolve({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    code: source.code,
  })
  const designContext = runtimeSource ? {
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: section.id,
    canonicalPlanAssetId: runtimeSource.assetId,
    canonicalGenerationId: runtimeSource.generationId,
    canonicalAuthorityEpoch: runtimeSource.authorityEpoch,
    blockId: block.id,
    projectionId: projection.projectionId,
  } : null

  const curriculumRepository = new SupabaseAnnualPlanCurriculumRepository()
  const [extensions, knowledgeItems, assignments, textbookAdoptions, curriculumBaseline, latestApproval] = await Promise.all([
    designContext ? new SupabaseLessonDesignRepository().list(designContext) : Promise.resolve([]),
    new SupabaseKnowledgeRepository().listRecent(context.workspace.id, 100),
    new SupabaseTeachingAssignmentReader().list(context.workspace.id, context.academicYear.id),
    new SupabaseTextbookRepository().list(context.workspace.id, context.academicYear.id),
    lessonCurriculumBaselineOrNull(curriculumRepository, {
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sectionId: section.id,
      disciplineRef: 'technology',
    }),
    designContext ? new SupabaseLessonPreparationApprovalRepository().latest(designContext) : Promise.resolve(null),
  ])

  let approvalStatus: LessonPreparationApprovalStatus = 'CURRICULUM_REQUIRED'
  if (designContext && curriculumBaseline && isCurriculumBaselineReadyForLessonApproval(curriculumBaseline)) {
    const preparationSnapshot = buildLessonPreparationApprovalSnapshot({
      context: designContext,
      curriculumBaseline,
      projection,
      extensions,
    })
    const currentPreparationFingerprint = lessonPreparationFingerprint(preparationSnapshot)
    approvalStatus = latestApproval
      ? latestApproval.preparationFingerprint === currentPreparationFingerprint
        ? 'APPROVED'
        : 'STALE'
      : 'NEEDS_APPROVAL'
  }

  const progress = runtimeSource
    ? snapshot.progress.find((entry) =>
        entry.sectionId === section.id &&
        entry.canonicalGenerationId === runtimeSource.generationId &&
        entry.blockId === block.id,
      ) ?? null
    : null
  const udaBlocks = blocks.filter((item) => item.uda === block.uda)
  const udaProgress = runtimeSource
    ? snapshot.progress.filter((entry) =>
        entry.sectionId === section.id &&
        entry.canonicalGenerationId === runtimeSource.generationId &&
        udaBlocks.some((item) => item.id === entry.blockId) &&
        COMPLETE_STATUSES.has(entry.status),
      ).length
    : 0

  const sectionAssignmentIds = new Set(
    assignments.filter((assignment) => assignment.sectionId === section.id).map((assignment) => assignment.id),
  )
  const confirmedTextbooks = Array.from(new Map(
    textbookAdoptions
      .filter((adoption) => adoption.status === 'CONFIRMED' && sectionAssignmentIds.has(adoption.teachingAssignmentId))
      .map((adoption) => [adoption.textbook.id, { id: adoption.textbook.id, title: adoption.textbook.title }]),
  ).values())

  const compactSectionLabel = `${GRADE_NUMBER[section.grade]}${section.sectionCode}`
  const atlasSuggestions = buildAtlasLessonSuggestions({
    compactSectionLabel,
    blockId: block.id,
    uda: block.uda,
    excludedMaterialIds: activeAtlasMaterialIds(extensions),
  })
  const knowledgeSuggestions = buildLessonMaterialSuggestions({
    items: knowledgeItems,
    grade: GRADE_QUERY[section.grade],
    compactSectionLabel,
    blockId: block.id,
    uda: block.uda,
    pack: block.pack,
    lessonTitle: projection.title,
    objective: projection.objective,
    confirmedTextbooks,
    excludedAssetIds: new Set(
      extensions.flatMap((extension) => extension.sourceRef?.startsWith('knowledge:')
        ? [extension.sourceRef.slice('knowledge:'.length)]
        : []),
    ),
  })

  const query = await searchParams
  const clock = currentRomeClock()
  const legacyMode = asLegacyMode(query.mode)
  const requestedIntent = asIntent(query.intent) ?? legacyIntent(legacyMode)
  const requestedSubtask = asSubtask(query.subtask) ?? (legacyMode === 'observe' ? 'observe' : null)
  const occurrenceContext = await resolveLessonOccurrenceContext({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: section.id,
    requestedDate: query.date,
    requestedOccurrenceLogicalId: query.occurrence,
    clock,
  })
  const registeredByProgress = Boolean(progress && COMPLETE_STATUSES.has(progress.status))
  const registeredByOccurrence = registeredByProgress || !occurrenceContext.occurrence
    ? false
    : await occurrenceHasBlockRegistration({
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
        sectionId: section.id,
        blockId: block.id,
        occurrenceLogicalId: occurrenceContext.occurrence.logicalId,
      })
  const registered = registeredByProgress || registeredByOccurrence
  const automaticState = resolveLessonWorkspaceState({
    localDate: clock.localDate,
    minuteOfDay: clock.minuteOfDay,
    occurrence: occurrenceContext.occurrence ? {
      localDate: occurrenceContext.occurrence.localDate,
      startAt: occurrenceContext.occurrence.startAt,
      endAt: occurrenceContext.occurrence.endAt,
    } : null,
    occurrenceAmbiguous: occurrenceContext.ambiguous,
    registered,
    intent: requestedIntent,
  })
  const resolvedState = legacyMode === 'prepare' && automaticState !== 'AMBIGUOUS' && automaticState !== 'CONTINUITY'
    ? 'PREPARATION'
    : automaticState
  const stateGateBlocked = !registered
    && approvalStatus !== 'APPROVED'
    && (resolvedState === 'TEACHING' || resolvedState === 'REGISTRATION')
  const observationGateBlocked = requestedSubtask === 'observe' && !registered && approvalStatus !== 'APPROVED'
  const governanceBlocked = stateGateBlocked || observationGateBlocked
  const visibleState: LessonWorkspaceResolvedState = governanceBlocked ? 'PREPARATION' : resolvedState
  const observationContextAllowed = resolvedState === 'TEACHING'
    || resolvedState === 'REGISTRATION'
    || resolvedState === 'CONTINUITY'
    || legacyMode === 'observe'
  const activeSubtask: LessonWorkspaceSubtask = requestedSubtask === 'materials'
    ? 'materials'
    : !governanceBlocked && requestedSubtask === 'observe' && observationContextAllowed
      ? 'observe'
      : null
  const canonicalDate = occurrenceContext.occurrence?.localDate ?? occurrenceContext.localDate
  const canonicalOccurrenceLogicalId = occurrenceContext.occurrence?.logicalId ?? null
  const statusLabel = lessonStatusLabel(visibleState, activeSubtask, governanceBlocked)

  const sectionLabel = `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`
  const classHref = `/classi/${encodeURIComponent(section.id)}`
  const progressView = {
    status: progress?.status ?? 'PIANIFICATO',
    executedOn: progress?.executedOn ?? null,
    evidenceNote: progress?.evidenceNote ?? null,
  }
  const udaProgressView = { completed: udaProgress, total: udaBlocks.length }
  const voiceCaptureEnabled = isVoiceCaptureReady(process.env.DOCENTE_OS_VOICE_CAPTURE, process.env.GROQ_STT_API_KEY)
  const commonWorkspaceProps = {
    localDate: canonicalDate,
    occurrenceLogicalId: canonicalOccurrenceLogicalId,
    statusLabel,
  }

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="lessonWorkspaceSurface"
      contextualAssistantEnabled={approvalStatus === 'APPROVED'}
      focusMode
    >
      <OpenDesignReview active={visibleState === 'PREPARATION' && query.review === 'design'} />
      {visibleState === 'AMBIGUOUS' ? (
        <main className={lessonStyles.closeSurface}>
          <LessonShell
            sectionLabel={sectionLabel}
            disciplineLabel="Tecnologia"
            lessonTitle={projection.title}
            statusLabel={statusLabel}
          />
          <section className={lessonStyles.closeCard} role="status">
            <p className={lessonStyles.eyebrow}>CONTESTO DA VERIFICARE</p>
            <h2>Questa apertura non identifica una sola lezione.</h2>
            <p className={lessonStyles.closeLead}>DOCENTE OS non sceglie al posto tuo quando orario, data o occorrenza non permettono un’associazione univoca.</p>
            <div className={lessonStyles.closeActions}>
              <Link className={lessonStyles.primary} href="/orario">Apri Orario</Link>
              <Link href={classHref}>Apri la classe</Link>
            </div>
          </section>
        </main>
      ) : activeSubtask === 'observe' ? (
        <LessonObserveClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
          explicitStartIntent={requestedIntent === 'start'}
          {...commonWorkspaceProps}
        />
      ) : visibleState === 'TEACHING' || visibleState === 'CONTINUITY' ? (
        <LessonLiveClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
          extensions={extensions}
          progress={progressView}
          udaProgress={udaProgressView}
          explicitStartIntent={requestedIntent === 'start'}
          {...commonWorkspaceProps}
        />
      ) : visibleState === 'REGISTRATION' ? (
        <LessonCloseClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
          defaultLocalDate={canonicalDate ?? clock.localDate}
          registrationKey={randomUUID()}
          voiceCaptureEnabled={voiceCaptureEnabled}
          nextBlockId={nextBlockId}
          {...commonWorkspaceProps}
        />
      ) : (
        <LessonPrepareClient
          sectionId={section.id}
          sectionLabel={sectionLabel}
          block={block}
          projection={projection}
          extensions={extensions}
          knowledgeSuggestions={knowledgeSuggestions}
          atlasSuggestions={atlasSuggestions}
          progress={progressView}
          udaProgress={udaProgressView}
          initialSubtask={activeSubtask === 'materials' ? 'materials' : null}
          approval={{
            status: approvalStatus,
            approvedAt: latestApproval?.approvedAt ?? null,
            notice: query.approval ?? (governanceBlocked ? 'required' : null),
            alignmentAuthority: curriculumBaseline?.alignmentAuthority ?? null,
            requiresRevalidationOnApproval: curriculumBaseline?.requiresRevalidationOnApproval ?? null,
          }}
          {...commonWorkspaceProps}
        />
      )}
    </AppShell>
  )
}

function asLegacyMode(value: string | undefined): LegacyLessonWorkspaceMode | null {
  if (value === 'prepare' || value === 'teach' || value === 'observe' || value === 'record') return value
  return null
}

function asIntent(value: string | undefined): LessonWorkspaceIntent {
  return value === 'start' || value === 'close' ? value : null
}

function asSubtask(value: string | undefined): LessonWorkspaceSubtask {
  return value === 'observe' || value === 'materials' ? value : null
}

function legacyIntent(mode: LegacyLessonWorkspaceMode | null): LessonWorkspaceIntent {
  if (mode === 'teach') return 'start'
  if (mode === 'record') return 'close'
  return null
}

function lessonStatusLabel(state: LessonWorkspaceResolvedState, subtask: LessonWorkspaceSubtask, governanceBlocked: boolean) {
  if (governanceBlocked) return 'Preparazione richiesta'
  if (subtask === 'observe') return 'Osservazione'
  if (subtask === 'materials') return 'Materiali della lezione'
  if (state === 'TEACHING') return 'In corso'
  if (state === 'REGISTRATION') return 'Da registrare'
  if (state === 'CONTINUITY') return 'Registrata'
  if (state === 'AMBIGUOUS') return 'Contesto da verificare'
  return 'Da preparare'
}

async function resolveLessonOccurrenceContext(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  requestedDate: string | undefined
  requestedOccurrenceLogicalId: string | undefined
  clock: { localDate: string; minuteOfDay: number }
}) {
  if (input.requestedDate && !isLocalDate(input.requestedDate)) {
    return { localDate: input.clock.localDate, occurrence: null, ambiguous: true }
  }
  if (input.requestedOccurrenceLogicalId && !input.requestedDate) {
    return { localDate: input.clock.localDate, occurrence: null, ambiguous: true }
  }

  const localDate = input.requestedDate ?? input.clock.localDate
  const projectedDay = await new TemporalProjectionService(
    new SupabaseTimetableProjectionReadRepository(),
    new SupabaseCalendarProjectionReadRepository(),
  ).projectDay({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    localDate,
  })

  if (input.requestedOccurrenceLogicalId) {
    const exact = projectedDay.occurrences.filter((occurrence) => occurrence.logicalId === input.requestedOccurrenceLogicalId)
    if (exact.length !== 1 || exact[0].kind !== 'LESSON' || exact[0].sectionId !== input.sectionId) {
      return { localDate, occurrence: null, ambiguous: true }
    }
    return { localDate, occurrence: exact[0], ambiguous: false }
  }

  const sectionOccurrences = projectedDay.occurrences.filter((occurrence) => occurrence.kind === 'LESSON' && occurrence.sectionId === input.sectionId)
  if (!sectionOccurrences.length) return { localDate, occurrence: null, ambiguous: false }
  if (sectionOccurrences.some((occurrence) => !occurrence.startAt || !occurrence.endAt)) {
    return { localDate, occurrence: null, ambiguous: true }
  }
  if (sectionOccurrences.length === 1) return { localDate, occurrence: sectionOccurrences[0], ambiguous: false }
  if (localDate !== input.clock.localDate) return { localDate, occurrence: null, ambiguous: true }

  const ranked = sectionOccurrences
    .map((occurrence) => ({ occurrence, distance: occurrenceDistanceMinutes(occurrence, input.clock.minuteOfDay) }))
    .sort((a, b) => a.distance - b.distance || a.occurrence.logicalId.localeCompare(b.occurrence.logicalId))
  if (!ranked.length || (ranked[1] && ranked[0].distance === ranked[1].distance)) {
    return { localDate, occurrence: null, ambiguous: true }
  }
  const overlapping = sectionOccurrences.filter((occurrence) => occurrenceDistanceMinutes(occurrence, input.clock.minuteOfDay) === 0)
  if (overlapping.length > 1) return { localDate, occurrence: null, ambiguous: true }
  return { localDate, occurrence: ranked[0].occurrence, ambiguous: false }
}

function occurrenceDistanceMinutes(occurrence: ProjectedOccurrence, minuteOfDay: number) {
  const start = localTimeMinutes(occurrence.startAt)
  const end = localTimeMinutes(occurrence.endAt)
  if (start === null || end === null || end <= start) return Number.POSITIVE_INFINITY
  if (minuteOfDay < start) return start - minuteOfDay
  if (minuteOfDay >= end) return minuteOfDay - end
  return 0
}

function localTimeMinutes(value: string | null) {
  const match = value?.match(/T(\d{2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

async function occurrenceHasBlockRegistration(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  blockId: string
  occurrenceLogicalId: string
}) {
  const snapshot = await new SupabaseTeachingSessionRepository().listBySection(input.workspaceId, input.academicYearId, input.sectionId)
  const supersededSessionIds = new Set(snapshot.sessions.flatMap((session) => session.supersedesSessionId ? [session.supersedesSessionId] : []))
  const matchingSessionIds = new Set(snapshot.sessions
    .filter((session) => !supersededSessionIds.has(session.id))
    .filter((session) => session.source.projectedOccurrenceLogicalId === input.occurrenceLogicalId)
    .map((session) => session.id))
  return snapshot.allocations.some((allocation) => matchingSessionIds.has(allocation.sessionId) && allocation.blockId === input.blockId)
}

function isLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function currentRomeClock() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    localDate: `${values.year}-${values.month}-${values.day}`,
    minuteOfDay: Number(values.hour) * 60 + Number(values.minute),
  }
}

async function lessonCurriculumBaselineOrNull(
  repository: SupabaseAnnualPlanCurriculumRepository,
  input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
    disciplineRef: string
  },
) {
  try {
    return await repository.currentBaseline(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/annual_plan_curriculum_current|PGRST202|schema cache/i.test(message)) return null
    throw error
  }
}
