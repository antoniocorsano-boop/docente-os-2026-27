import {
  acceptedTeachingAdjustments,
  type LessonDesignDecision,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'

export type LessonReplanningCanonicalScope = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
}

export type LessonReplanningDecision = {
  extensionId: string
  title: string
  body: string
  sourceRef: string
  sourceLabel: string
  acceptedAt: string
  acceptedBy: string | null
  revision: number
  decisionHistory: LessonDesignDecision[]
}

export type LessonReplanningProjection = {
  resolution: 'SUPPORTED' | 'BLOCKED'
  decisions: LessonReplanningDecision[]
  reasons: string[]
}

export type LessonReplanningDisplayDecision = Pick<
  LessonReplanningDecision,
  'title' | 'body' | 'sourceLabel' | 'acceptedAt'
>

export type LessonReplanningDisplayProjection = {
  resolution: LessonReplanningProjection['resolution']
  decisions: LessonReplanningDisplayDecision[]
}

export function emptyLessonReplanningProjection(): LessonReplanningProjection {
  return {
    resolution: 'SUPPORTED',
    decisions: [],
    reasons: [],
  }
}

export function toLessonReplanningDisplayProjection(
  replanning: LessonReplanningProjection,
): LessonReplanningDisplayProjection {
  return {
    resolution: replanning.resolution,
    decisions: replanning.resolution === 'SUPPORTED'
      ? replanning.decisions.map((decision) => ({
          title: decision.title,
          body: decision.body,
          sourceLabel: decision.sourceLabel,
          acceptedAt: decision.acceptedAt,
        }))
      : [],
  }
}

export function projectAcceptedTeachingAdjustments(input: {
  extensions: LessonDesignExtension[]
  scope: LessonReplanningCanonicalScope
}): LessonReplanningProjection {
  const accepted = acceptedTeachingAdjustments(input.extensions)
  const reasons: string[] = []

  for (const extension of accepted) {
    compareScope(extension, input.scope, reasons)

    if (!extension.sourceRef?.trim()) {
      reasons.push(`REPLANNING_SOURCE_MISSING:${extension.id}`)
    }
    if (!extension.acceptedAt) {
      reasons.push(`REPLANNING_ACCEPTANCE_TIMESTAMP_MISSING:${extension.id}`)
    }
    if (!extension.decisionHistory.some((decision) => decision.action === 'ACCEPTED')) {
      reasons.push(`REPLANNING_ACCEPTANCE_HISTORY_MISSING:${extension.id}`)
    }
  }

  if (reasons.length) {
    return {
      resolution: 'BLOCKED',
      decisions: [],
      reasons: unique(reasons),
    }
  }

  return {
    resolution: 'SUPPORTED',
    decisions: accepted.map((extension) => ({
      extensionId: extension.id,
      title: extension.title,
      body: extension.body,
      sourceRef: extension.sourceRef as string,
      sourceLabel: extension.sourceLabel?.trim() || 'Riflessione post-lezione',
      acceptedAt: extension.acceptedAt as string,
      acceptedBy: extension.acceptedBy,
      revision: extension.revision,
      decisionHistory: extension.decisionHistory.map((decision) => ({ ...decision })),
    })),
    reasons: [],
  }
}

function compareScope(
  extension: LessonDesignExtension,
  scope: LessonReplanningCanonicalScope,
  reasons: string[],
) {
  const checks: Array<[keyof LessonReplanningCanonicalScope, string, string]> = [
    ['workspaceId', extension.workspaceId, scope.workspaceId],
    ['academicYearId', extension.academicYearId, scope.academicYearId],
    ['sectionId', extension.sectionId, scope.sectionId],
    ['canonicalPlanAssetId', extension.canonicalPlanAssetId, scope.canonicalPlanAssetId],
    ['canonicalGenerationId', extension.canonicalGenerationId, scope.canonicalGenerationId],
    ['blockId', extension.blockId, scope.blockId],
    ['projectionId', extension.projectionId, scope.projectionId],
  ]

  for (const [field, actual, expected] of checks) {
    if (actual !== expected) {
      reasons.push(`REPLANNING_SCOPE_MISMATCH:${extension.id}:${field}`)
    }
  }
}

function unique(values: string[]) {
  return [...new Set(values)]
}
