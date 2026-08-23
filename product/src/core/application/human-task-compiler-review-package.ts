import type { GradeKey } from '@/app/piano-annuale/model'
import type { HumanTaskCompilerPlanFragment } from './human-task-pack-alignment-classifier'
import type { HumanTaskExtendedTrancheReview } from './human-task-tranche-compiler-pack-extension'

export type HumanTaskCompilerReviewDecision = 'PENDING' | 'APPROVE' | 'CORRECT' | 'BLOCK'

export type HumanTaskCompilerReviewPackage = {
  packageVersion: 1
  compilerVersion: number
  status: 'READY_FOR_HUMAN_REVIEW' | 'BLOCKED' | 'AMBIGUOUS_SOURCE_ALIGNMENT' | 'COMPLETE'
  promotion: 'HUMAN_APPROVAL_REQUIRED' | 'NONE'
  grade: GradeKey
  segmentKey: string | null
  blockIds: string[]
  sourceBindings: Array<{
    code: string
    assetId: string
    generationId: string
  }>
  items: Array<{
    blockId: string
    title: string
    proposedRecipe: string
    proposedPackHeadings: string[]
    planActivity: string | null
    planEvidence: string | null
    compilerNote: string
    decision: HumanTaskCompilerReviewDecision
  }>
  constraints: string[]
  decision: HumanTaskCompilerReviewDecision
}

/**
 * Converts a compiler result into the small declarative artifact a human reviews.
 * It intentionally does not contain runtime projection content or approval.
 */
export function buildHumanTaskCompilerReviewPackage(input: {
  review: HumanTaskExtendedTrancheReview
  planFragments: HumanTaskCompilerPlanFragment[]
}): HumanTaskCompilerReviewPackage {
  const fragmentByBlock = new Map(input.planFragments.map((fragment) => [fragment.blockId.toUpperCase(), fragment]))
  const ready = input.review.status === 'READY_FOR_HUMAN_REVIEW'

  return {
    packageVersion: 1,
    compilerVersion: input.review.compilerVersion,
    status: input.review.status,
    promotion: ready ? 'HUMAN_APPROVAL_REQUIRED' : input.review.status === 'COMPLETE' ? 'NONE' : 'HUMAN_APPROVAL_REQUIRED',
    grade: input.review.grade,
    segmentKey: input.review.segmentKey,
    blockIds: [...input.review.blockIds],
    sourceBindings: input.review.sourceBindings.map((binding) => ({ ...binding })),
    items: input.review.items.map((item) => {
      const fragment = fragmentByBlock.get(item.blockId)
      return {
        blockId: item.blockId,
        title: item.title,
        proposedRecipe: item.proposedRecipe,
        proposedPackHeadings: [...item.proposedPackHeadings],
        planActivity: fragment?.activity ?? null,
        planEvidence: fragment?.evidence ?? null,
        compilerNote: item.note,
        decision: 'PENDING',
      }
    }),
    constraints: [
      'Il Piano annuale mantiene ordine, blocco, durata ed evidenza canonica.',
      'Il PACK può fornire passaggi operativi ma non inventare o sostituire la durata del blocco.',
      'UDA e PACK devono restare legati alle generazioni correnti registrate nel pacchetto.',
      'Nessuna temporizzazione interna viene dedotta quando non è esplicita nella fonte.',
      'Il pacchetto di revisione non è una proiezione runtime e non equivale ad approvazione.',
    ],
    decision: 'PENDING',
  }
}
