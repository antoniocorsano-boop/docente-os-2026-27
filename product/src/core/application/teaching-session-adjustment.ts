import type {
  TeachingSessionAllocationRecord,
  TeachingSessionRecord,
} from '@/core/domain/teaching-session'
import type {
  LessonDesignExtensionDraft,
} from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'

export type TeachingSessionAdjustmentContext = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
}

export type TeachingSessionAdjustmentProposal = {
  context: TeachingSessionAdjustmentContext
  draft: LessonDesignExtensionDraft
  dedupeKey: string
}

/**
 * Builds the persistence input for H8-B2 from already-authoritative records.
 * The caller must load the TeachingSession under RLS and resolve the runtime
 * projection from the canonical grade + block before calling this function.
 */
export function buildTeachingSessionAdjustmentProposal(input: {
  session: TeachingSessionRecord
  allocations: TeachingSessionAllocationRecord[]
  blockId: string
  projection: HumanTaskLessonProjection
  body: string
  title?: string
}): TeachingSessionAdjustmentProposal {
  const blockId = input.blockId.trim().toUpperCase()
  const allocation = input.allocations.find(
    (candidate) => candidate.sessionId === input.session.id && candidate.blockId.toUpperCase() === blockId,
  )
  if (!allocation) throw new Error('Teaching adjustment block is not allocated to the teaching session')
  if (input.projection.blockId.toUpperCase() !== blockId) {
    throw new Error('Teaching adjustment projection does not match the allocated block')
  }

  const body = input.body.trim()
  if (!body) throw new Error('Teaching adjustment proposal body is required')

  const dedupeKey = `teaching-adjustment:${input.session.id}:${input.projection.projectionId}`
  const context: TeachingSessionAdjustmentContext = {
    workspaceId: input.session.workspaceId,
    academicYearId: input.session.academicYearId,
    sectionId: input.session.sectionId,
    canonicalPlanAssetId: allocation.canonicalPlanAssetId,
    canonicalGenerationId: allocation.canonicalGenerationId,
    blockId,
    projectionId: input.projection.projectionId,
  }

  return {
    context,
    dedupeKey,
    draft: {
      sectionId: context.sectionId,
      canonicalPlanAssetId: context.canonicalPlanAssetId,
      canonicalGenerationId: context.canonicalGenerationId,
      blockId: context.blockId,
      projectionId: context.projectionId,
      kind: 'TEACHING_ADJUSTMENT',
      insertionPosition: 'END',
      anchorStepId: null,
      title: input.title?.trim() || 'Riflessione da riesaminare',
      body,
      cue: null,
      minutes: null,
      sourceKind: 'TEACHER',
      sourceRef: input.session.id,
      sourceLabel: 'Riflessione post-lezione',
      payload: {
        dedupeKey,
        teachingSessionId: input.session.id,
        projectionId: input.projection.projectionId,
      },
    },
  }
}
