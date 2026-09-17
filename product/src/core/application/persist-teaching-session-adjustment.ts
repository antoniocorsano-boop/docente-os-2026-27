import type { LessonDesignExtension, LessonDesignExtensionDraft } from '@/core/domain/lesson-design-extension'
import type { TeachingSessionSnapshot } from '@/core/domain/teaching-session'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import {
  buildTeachingSessionAdjustmentProposal,
  type TeachingSessionAdjustmentContext,
} from './teaching-session-adjustment'

export interface TeachingSessionAdjustmentReadRepository {
  getById(
    workspaceId: string,
    academicYearId: string,
    teachingSessionId: string,
  ): Promise<TeachingSessionSnapshot | null>
}

export interface TeachingSessionAdjustmentWriteRepository {
  addToolProposalOnce(
    context: TeachingSessionAdjustmentContext,
    input: LessonDesignExtensionDraft,
    dedupeKey: string,
  ): Promise<LessonDesignExtension>
}

/**
 * H8-B2 command boundary. The caller supplies only the active workspace/year,
 * a TeachingSession id, the allocated block and its already-resolved canonical
 * runtime projection. All persisted plan identity is re-derived from the
 * RLS-backed TeachingSession snapshot, never trusted from form input.
 */
export async function persistTeachingSessionAdjustment(input: {
  workspaceId: string
  academicYearId: string
  teachingSessionId: string
  blockId: string
  projection: HumanTaskLessonProjection
  body: string
  title?: string
}, dependencies: {
  teaching: TeachingSessionAdjustmentReadRepository
  lessonDesign: TeachingSessionAdjustmentWriteRepository
}): Promise<LessonDesignExtension> {
  const snapshot = await dependencies.teaching.getById(
    input.workspaceId,
    input.academicYearId,
    input.teachingSessionId,
  )
  const session = snapshot?.sessions[0]
  if (!snapshot || !session || session.id !== input.teachingSessionId) {
    throw new Error('Teaching session is outside the active context')
  }
  if (session.workspaceId !== input.workspaceId || session.academicYearId !== input.academicYearId) {
    throw new Error('Teaching session is outside the active context')
  }

  const proposal = buildTeachingSessionAdjustmentProposal({
    session,
    allocations: snapshot.allocations,
    blockId: input.blockId,
    projection: input.projection,
    body: input.body,
    title: input.title,
  })

  return dependencies.lessonDesign.addToolProposalOnce(
    proposal.context,
    proposal.draft,
    proposal.dedupeKey,
  )
}
