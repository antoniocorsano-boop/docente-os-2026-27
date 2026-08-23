import type { GradeKey } from '@/app/piano-annuale/model'
import type { HumanTaskContentCandidate } from './human-task-content-pipeline'
import {
  buildPackComposedProjectionDraft,
  type HumanTaskPackComposedProjectionRecipe,
} from './human-task-pack-composed-projection-recipe'
import {
  buildPlanGuidedUdaProjectionDraft,
  type HumanTaskPlanGuidedUdaProjectionRecipe,
} from './human-task-plan-guided-uda-projection-recipe'
import {
  buildProjectionDraft,
  type HumanTaskProjectionDraft,
  type HumanTaskProjectionRecipe,
} from './human-task-projection-recipe'
import {
  buildUdaOnlyProjectionDraft,
  type HumanTaskUdaOnlyProjectionRecipe,
} from './human-task-uda-only-projection-recipe'

export type HumanTaskProjectionGapReason =
  | 'NO_OPERATIONAL_GUIDE'
  | 'AMBIGUOUS_SOURCE_ALIGNMENT'
  | 'SOURCE_MISSING'

export type HumanTaskProjectionGap = {
  grade: GradeKey
  blockId: string
  reason: HumanTaskProjectionGapReason
  note: string
}

export type HumanTaskProjectionBatchRecipe =
  | HumanTaskProjectionRecipe
  | HumanTaskUdaOnlyProjectionRecipe
  | HumanTaskPackComposedProjectionRecipe
  | HumanTaskPlanGuidedUdaProjectionRecipe

export type HumanTaskProjectionBatchItem = {
  grade: GradeKey
  blockId: string
  status: 'READY_FOR_HUMAN_APPROVAL' | 'BLOCKED'
  reason: 'DRAFT_READY' | 'DRAFT_INVALID' | 'NO_RECIPE' | HumanTaskProjectionGapReason
  note: string | null
  draft: HumanTaskProjectionDraft | null
}

export function buildProjectionBatchReview(
  candidates: HumanTaskContentCandidate[],
  recipes: HumanTaskProjectionBatchRecipe[],
  gaps: HumanTaskProjectionGap[] = [],
): HumanTaskProjectionBatchItem[] {
  const recipeByKey = new Map(recipes.map((recipe) => [key(recipe.grade, recipe.blockId), recipe]))
  const gapByKey = new Map(gaps.map((gap) => [key(gap.grade, gap.blockId), gap]))

  return candidates.map((candidate) => {
    const itemKey = key(candidate.grade, candidate.blockId)
    const recipe = recipeByKey.get(itemKey)
    const gap = gapByKey.get(itemKey)

    if (!recipe) {
      return {
        grade: candidate.grade,
        blockId: candidate.blockId,
        status: 'BLOCKED',
        reason: gap?.reason ?? 'NO_RECIPE',
        note: gap?.note ?? 'Nessun Projection Recipe è stato approvato per questo blocco.',
        draft: null,
      }
    }

    const draft = isUdaOnlyRecipe(recipe)
      ? buildUdaOnlyProjectionDraft(candidate, recipe)
      : isPackComposedRecipe(recipe)
        ? buildPackComposedProjectionDraft(candidate, recipe)
        : isPlanGuidedUdaRecipe(recipe)
          ? buildPlanGuidedUdaProjectionDraft(candidate, recipe)
          : buildProjectionDraft(candidate, recipe)

    if (draft.status === 'INVALID') {
      return {
        grade: candidate.grade,
        blockId: candidate.blockId,
        status: 'BLOCKED',
        reason: 'DRAFT_INVALID',
        note: draft.issues.map((issue) => issue.message).join(' '),
        draft,
      }
    }

    return {
      grade: candidate.grade,
      blockId: candidate.blockId,
      status: 'READY_FOR_HUMAN_APPROVAL',
      reason: 'DRAFT_READY',
      note: draft.issues.length ? draft.issues.map((issue) => issue.message).join(' ') : null,
      draft,
    }
  })
}

function isUdaOnlyRecipe(recipe: HumanTaskProjectionBatchRecipe): recipe is HumanTaskUdaOnlyProjectionRecipe {
  return 'mode' in recipe && recipe.mode === 'UDA_ONLY'
}

function isPackComposedRecipe(recipe: HumanTaskProjectionBatchRecipe): recipe is HumanTaskPackComposedProjectionRecipe {
  return 'mode' in recipe && recipe.mode === 'PACK_COMPOSED'
}

function isPlanGuidedUdaRecipe(recipe: HumanTaskProjectionBatchRecipe): recipe is HumanTaskPlanGuidedUdaProjectionRecipe {
  return 'mode' in recipe && recipe.mode === 'PLAN_GUIDED_UDA'
}

function key(grade: GradeKey, blockId: string) {
  return `${grade}:${blockId.toUpperCase()}`
}
