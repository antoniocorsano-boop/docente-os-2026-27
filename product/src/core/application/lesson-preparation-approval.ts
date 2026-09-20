import { createHash } from 'node:crypto'
import type { AnnualPlanCurriculumBaselineSnapshot } from '@/core/domain/cml-curriculum-revalidation'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'

export type LessonPreparationApprovalStatus = 'CURRICULUM_REQUIRED' | 'NEEDS_APPROVAL' | 'STALE' | 'APPROVED'

export type LessonPreparationContext = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
}

export type LessonPreparationApprovalSnapshot = {
  schemaVersion: 1
  context: LessonPreparationContext
  canonicalPlan: {
    assetId: string
    generationId: string
  }
  curriculum: {
    baselineFingerprint: string
    curriculumState: AnnualPlanCurriculumBaselineSnapshot['curriculumState']
    alignmentAuthority: AnnualPlanCurriculumBaselineSnapshot['alignmentAuthority']
    acceptedAt: string
    sourceHandoffFootprintHash: string
    curricularContext: AnnualPlanCurriculumBaselineSnapshot['curricularContext']
    curriculumCoverage: AnnualPlanCurriculumBaselineSnapshot['curriculumCoverage']
    reviewedFramework: AnnualPlanCurriculumBaselineSnapshot['reviewedFramework']
  }
  lesson: {
    projection: HumanTaskLessonProjection
    acceptedExtensions: Array<{
      id: string
      revision: number
      kind: LessonDesignExtension['kind']
      insertionPosition: LessonDesignExtension['insertionPosition']
      anchorStepId: string | null
      title: string
      body: string
      cue: string | null
      minutes: number | null
      sourceKind: LessonDesignExtension['sourceKind']
      sourceRef: string | null
      sourceLabel: string | null
      payload: Record<string, unknown>
      acceptedBy: string | null
      acceptedAt: string | null
    }>
  }
}

export function isCurriculumBaselineReadyForLessonApproval(
  baseline: AnnualPlanCurriculumBaselineSnapshot | null,
): baseline is AnnualPlanCurriculumBaselineSnapshot {
  if (!baseline
    || baseline.curricularContext.completeForPlanning !== true
    || baseline.curricularContext.transitionRemodulation.usableForPlanning !== true
    || baseline.curriculumCoverage.status !== 'SATISFIED'
    || baseline.curriculumCoverage.authority !== baseline.alignmentAuthority
    || baseline.curriculumCoverage.requiresRevalidationOnApproval !== baseline.requiresRevalidationOnApproval) {
    return false
  }

  const approvedInstitutional = baseline.curriculumState === 'APPROVED'
    && baseline.alignmentAuthority === 'APPROVED_INSTITUTIONAL'
    && baseline.requiresRevalidationOnApproval === false

  // Teacher authority is limited to the lesson preparation: this does not promote
  // a provisional Arena curriculum to institutional approval.
  const provisionalPlanningBaseline = baseline.curriculumState === 'PROVISIONAL_COMPLETE'
    && baseline.alignmentAuthority === 'PROVISIONAL_BASELINE'
    && baseline.requiresRevalidationOnApproval === true

  return approvedInstitutional || provisionalPlanningBaseline
}

export function buildLessonPreparationApprovalSnapshot(input: {
  context: LessonPreparationContext
  curriculumBaseline: AnnualPlanCurriculumBaselineSnapshot
  projection: HumanTaskLessonProjection
  extensions: LessonDesignExtension[]
}): LessonPreparationApprovalSnapshot {
  const acceptedExtensions = input.extensions
    .filter((extension) => extension.status === 'ACCEPTED')
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((extension) => ({
      id: extension.id,
      revision: extension.revision,
      kind: extension.kind,
      insertionPosition: extension.insertionPosition,
      anchorStepId: extension.anchorStepId,
      title: extension.title,
      body: extension.body,
      cue: extension.cue,
      minutes: extension.minutes,
      sourceKind: extension.sourceKind,
      sourceRef: extension.sourceRef,
      sourceLabel: extension.sourceLabel,
      payload: extension.payload,
      acceptedBy: extension.acceptedBy,
      acceptedAt: extension.acceptedAt,
    }))

  return {
    schemaVersion: 1,
    context: { ...input.context },
    canonicalPlan: {
      assetId: input.context.canonicalPlanAssetId,
      generationId: input.context.canonicalGenerationId,
    },
    curriculum: {
      baselineFingerprint: curriculumBaselineFingerprint(input.curriculumBaseline),
      curriculumState: input.curriculumBaseline.curriculumState,
      alignmentAuthority: input.curriculumBaseline.alignmentAuthority,
      acceptedAt: input.curriculumBaseline.acceptedAt,
      sourceHandoffFootprintHash: input.curriculumBaseline.sourceHandoffFootprintHash,
      curricularContext: input.curriculumBaseline.curricularContext,
      curriculumCoverage: input.curriculumBaseline.curriculumCoverage,
      reviewedFramework: input.curriculumBaseline.reviewedFramework,
    },
    lesson: {
      projection: input.projection,
      acceptedExtensions,
    },
  }
}

export function curriculumBaselineFingerprint(baseline: AnnualPlanCurriculumBaselineSnapshot) {
  return sha256(baseline)
}

export function lessonPreparationFingerprint(snapshot: LessonPreparationApprovalSnapshot) {
  return sha256(snapshot)
}

function sha256(value: unknown) {
  return createHash('sha256').update(canonicalSerialize(value)).digest('hex')
}

function canonicalSerialize(value: unknown) {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value

  const source = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(source)
      .filter((key) => source[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalize(source[key])]),
  )
}
