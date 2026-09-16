import {
  resourceDescriptor,
  type CopilotEvidenceRef,
  type CopilotResourceDescriptor,
  type CopilotResourceScope,
  type CopilotRunContext,
} from './copilot-kernel'
import type { ContextualCaptureTarget } from '@/core/presentation/contextual-capture'
import type { LessonPreparationManifestResult } from '@/core/presentation/lesson-preparation-manifest'
import type { TodayCopilotK2Context } from '@/core/presentation/next-lesson-preparation'

export function assembleNextLessonPreparationCopilotContext(input: {
  runId: string
  today: TodayCopilotK2Context
  manifest: LessonPreparationManifestResult | null
}): CopilotRunContext {
  const preparation = input.today.nextLessonPreparation
  const sectionId = preparation?.lesson.sectionId ?? null
  const disciplineId = preparation?.lesson.disciplineId ?? null
  const scope: CopilotResourceScope = {
    workspaceId: input.today.workspaceId,
    localDate: input.today.today.localDate,
    ...(input.today.academicYearId ? { academicYearId: input.today.academicYearId } : {}),
    ...(sectionId ? { sectionId } : {}),
    ...(disciplineId ? { disciplineId } : {}),
  }
  const canonical = preparation?.canonicalLesson ?? null
  const manifest = input.manifest?.manifest ?? null
  const temporalAmbiguous = input.today.today.authority === 'AMBIGUOUS'
  const knowledgeUnavailable = input.today.missingInformation.some((item) =>
    item.toLocaleLowerCase('it-IT').includes('indice della conoscenza temporaneamente non disponibile'),
  )
  const curriculumEvidence = input.today.provenance.find((item) => item.kind === 'CURRICULUM_AUTHORITY')

  const resources: CopilotResourceDescriptor[] = [
    resourceDescriptor({
      id: `today:${input.today.today.localDate}`,
      kind: 'HOME_DAILY_CONTEXT',
      state: temporalAmbiguous ? 'AMBIGUOUS' : 'AVAILABLE',
      authority: temporalAmbiguous
        ? 'TO_VERIFY'
        : input.today.today.authority === 'PROVISIONAL_DRAFT'
          ? 'PROVISIONAL'
          : 'AUTHORITATIVE',
      scope,
      provenance: evidence(input.today.provenance.filter((item) => item.kind.startsWith('TIMETABLE_') || item.kind.startsWith('CALENDAR_') || item.kind.startsWith('TEMPORAL_'))),
    }),
    resourceDescriptor({
      id: manifest ? `lesson-brief:${manifest.projectionId}` : 'lesson-brief:unresolved',
      kind: 'LESSON_BRIEF',
      state: canonical && input.manifest?.resolution !== 'BLOCKED' ? 'AVAILABLE' : 'MISSING',
      authority: canonical ? 'AUTHORITATIVE' : 'TO_VERIFY',
      scope,
      provenance: manifest
        ? evidence(input.today.provenance.filter((item) => item.kind === 'CANONICAL_PLAN' || item.kind.startsWith('LESSON_')))
        : [],
    }),
    resourceDescriptor({
      id: `knowledge:${input.today.workspaceId}`,
      kind: 'KNOWLEDGE_INDEX',
      state: knowledgeUnavailable ? 'MISSING' : 'AVAILABLE',
      authority: knowledgeUnavailable ? 'TO_VERIFY' : 'AUTHORITATIVE',
      scope,
      provenance: evidence(input.today.provenance.filter((item) => item.kind === 'KNOWLEDGE_ASSET')),
    }),
    resourceDescriptor({
      id: canonical ? `annual-plan:${canonical.blockId}` : 'annual-plan:unresolved',
      kind: 'ANNUAL_PLAN_CONTEXT',
      state: canonical ? 'AVAILABLE' : 'MISSING',
      authority: canonical ? 'AUTHORITATIVE' : 'TO_VERIFY',
      scope,
      provenance: evidence(input.today.provenance.filter((item) => item.kind === 'CANONICAL_PLAN')),
    }),
  ]

  if (curriculumEvidence) {
    resources.push(resourceDescriptor({
      id: curriculumEvidence.ref ?? 'curriculum:current',
      kind: 'CURRICULUM_AUTHORITY',
      state: 'AVAILABLE',
      authority: 'AUTHORITATIVE',
      scope,
      provenance: evidence([curriculumEvidence]),
    }))
  }

  return {
    run: {
      id: input.runId,
      localDate: input.today.today.localDate,
      surface: 'TODAY',
    },
    identity: {
      workspaceId: input.today.workspaceId,
      ...(input.today.academicYearId ? { academicYearId: input.today.academicYearId } : {}),
      role: 'TEACHER',
    },
    ...(preparation
      ? {
          focus: {
            type: 'NEXT_LESSON',
            id: preparation.lesson.logicalId,
            title: preparation.lesson.title,
          },
        }
      : {}),
    resources,
    capabilities: {
      available: [...input.today.availableCapabilities],
      forbidden: [...input.today.forbiddenCapabilities],
    },
    missing: unique([
      ...input.today.missingInformation,
      ...(input.manifest?.resolution === 'BLOCKED' ? input.manifest.reasons : []),
      ...(manifest?.missingInformation ?? []),
    ]),
    privacy: {
      classification: 'PROFESSIONAL',
      providerPolicy: 'NO_MODEL',
    },
    provenance: evidence([
      ...input.today.provenance,
      ...(manifest?.provenance ?? []),
    ]),
  }
}

export function assembleLessonReflectionCopilotContext(input: {
  runId: string
  localDate: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  sectionLabel: string
  blockId: string
  projectionId: string | null
  lessonTitle: string
  canonicalPlanRef: string
  canonicalPlanLabel: string
}): { context: CopilotRunContext; target: ContextualCaptureTarget } {
  const scope: CopilotResourceScope = {
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    sectionId: input.sectionId,
    localDate: input.localDate,
  }
  const canonicalPlanEvidence: CopilotEvidenceRef = {
    kind: 'CANONICAL_PLAN',
    ref: input.canonicalPlanRef,
    label: input.canonicalPlanLabel,
    authority: 'AUTHORITATIVE',
  }
  const projectionEvidence: CopilotEvidenceRef | null = input.projectionId
    ? {
        kind: 'LESSON_PROJECTION',
        ref: input.projectionId,
        label: input.lessonTitle,
        authority: 'AUTHORITATIVE',
      }
    : null
  const provenance: CopilotEvidenceRef[] = projectionEvidence
    ? [canonicalPlanEvidence, projectionEvidence]
    : [canonicalPlanEvidence]
  const lessonRef = input.projectionId
    ? `${input.sectionId}:${input.blockId}:${input.projectionId}`
    : `${input.sectionId}:${input.blockId}:annual-plan`

  return {
    context: {
      run: {
        id: input.runId,
        localDate: input.localDate,
        surface: 'LESSON',
      },
      identity: {
        workspaceId: input.workspaceId,
        academicYearId: input.academicYearId,
        role: 'TEACHER',
      },
      focus: {
        type: 'LESSON',
        id: lessonRef,
        title: input.lessonTitle,
      },
      resources: [
        resourceDescriptor({
          id: input.projectionId
            ? `lesson-brief:${input.projectionId}`
            : `lesson-brief:annual-plan:${input.blockId}`,
          kind: 'LESSON_BRIEF',
          state: 'AVAILABLE',
          authority: 'AUTHORITATIVE',
          scope,
          provenance,
        }),
        resourceDescriptor({
          id: `annual-plan:${input.blockId}`,
          kind: 'ANNUAL_PLAN_CONTEXT',
          state: 'AVAILABLE',
          authority: 'AUTHORITATIVE',
          scope,
          provenance: [canonicalPlanEvidence],
        }),
      ],
      capabilities: {
        available: ['LESSON_READ'],
        forbidden: [
          'LESSON_RECORD_EXECUTION',
          'LESSON_SAVE_OBSERVATION',
          'PLAN_COMPLETE_BLOCK',
          'PLAN_UPDATE_PROGRESS',
          'CALENDAR_WRITE',
          'DRIVE_WRITE',
          'GMAIL_SEND',
        ],
      },
      missing: input.projectionId ? [] : ['HumanTask lesson projection unavailable; using canonical annual plan context.'],
      privacy: {
        classification: 'PROFESSIONAL',
        providerPolicy: 'NO_MODEL',
      },
      provenance,
    },
    target: {
      sectionId: input.sectionId,
      sectionLabel: input.sectionLabel,
      blockId: input.blockId,
      ...(input.projectionId ? { projectionId: input.projectionId } : {}),
      lessonRef,
      provenance: provenance.map((item) => ({
        kind: item.kind,
        ref: item.ref,
        label: item.label,
      })),
    },
  }
}

function evidence(items: Array<{ kind: string; ref?: string; label?: string }>): CopilotEvidenceRef[] {
  const seen = new Set<string>()
  return items.flatMap((item) => {
    if (!item.ref) return []
    const key = `${item.kind}:${item.ref}:${item.label ?? ''}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      kind: item.kind,
      ref: item.ref,
      ...(item.label ? { label: item.label } : {}),
    }]
  })
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
