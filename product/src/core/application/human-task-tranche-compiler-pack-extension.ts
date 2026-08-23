import { buildBlocks, type GradeKey } from '@/app/piano-annuale/model'
import {
  compileHumanTaskContentCandidate,
  type HumanTaskPipelineSource,
} from './human-task-content-pipeline'
import {
  classifyOrderedPackAlignment,
  type HumanTaskCompilerPlanFragment,
  type HumanTaskPackAlignmentResult,
} from './human-task-pack-alignment-classifier'
import {
  compileHumanTaskTrancheReview,
  discoverNextHumanTaskTranche,
  type HumanTaskTrancheCompilerReview,
} from './human-task-tranche-compiler'

export type HumanTaskExtendedCompilerRecipe = 'PLAN_GUIDED_UDA' | 'PACK_COMPOSED' | 'UNRESOLVED'

export type HumanTaskExtendedCompilerItem = HumanTaskTrancheCompilerReview['items'][number] & {
  proposedRecipe: HumanTaskExtendedCompilerRecipe
  proposedPackHeadings: string[]
}

export type HumanTaskExtendedTrancheReview = Omit<HumanTaskTrancheCompilerReview, 'items' | 'status'> & {
  compilerVersion: 2
  status: HumanTaskTrancheCompilerReview['status']
  items: HumanTaskExtendedCompilerItem[]
  packAlignment: HumanTaskPackAlignmentResult | null
}

export type CompileExtendedHumanTaskTrancheInput = {
  grade: GradeKey
  coveredBlockIds: Iterable<string>
  sources: HumanTaskPipelineSource[]
  planFragments: HumanTaskCompilerPlanFragment[]
}

/**
 * V2 extension of the existing tranche compiler.
 *
 * V1 remains the structural/phase classifier. V2 adds a second deterministic
 * attempt only when the main PACK exposes an ordered operational path and the
 * Plan provides exact activity/evidence fragments. A stable PACK partition can
 * resolve a phase-level ambiguity without inventing a new recipe family.
 */
export function compileHumanTaskTrancheReviewWithPackAlignment(
  input: CompileExtendedHumanTaskTrancheInput,
): HumanTaskExtendedTrancheReview {
  const base = compileHumanTaskTrancheReview(input)
  const defaultItems: HumanTaskExtendedCompilerItem[] = base.items.map((item) => ({
    ...item,
    proposedRecipe: item.proposedRecipe,
    proposedPackHeadings: [],
  }))

  if (base.status === 'COMPLETE' || base.status === 'BLOCKED' || !base.blockIds.length) {
    return {
      ...base,
      compilerVersion: 2,
      items: defaultItems,
      packAlignment: null,
    }
  }

  const tranche = discoverNextHumanTaskTranche(input.grade, input.coveredBlockIds)
  const sourceMap = new Map(input.sources.map((source) => [source.code, source]))
  const candidates = tranche.map((block) => compileHumanTaskContentCandidate(input.grade, block.id, {
    uda: sourceMap.get(`CAN-UDA-${block.uda}`) ?? null,
    pack: sourceMap.get(block.pack) ?? null,
    supportPacks: block.supportPacks.flatMap((code) => {
      const source = sourceMap.get(code)
      return source ? [source] : []
    }),
  }))

  if (candidates.some((candidate) => candidate.gate.status === 'BLOCKED')) {
    return {
      ...base,
      compilerVersion: 2,
      items: defaultItems,
      packAlignment: null,
    }
  }

  const canonicalBlocks = buildBlocks(input.grade).filter((block) => block.segmentKey === tranche[0]?.segmentKey)
  const packAlignment = classifyOrderedPackAlignment({
    blocks: canonicalBlocks,
    candidates,
    planFragments: input.planFragments,
  })

  if (packAlignment.status !== 'READY' || !packAlignment.recommended) {
    return {
      ...base,
      compilerVersion: 2,
      items: defaultItems,
      packAlignment,
    }
  }

  const recommendedByBlock = new Map(packAlignment.recommended.blocks.map((item) => [item.blockId, item]))
  const items = defaultItems.map((item) => {
    const pack = recommendedByBlock.get(item.blockId)
    if (!pack) return item
    return {
      ...item,
      status: 'READY_FOR_HUMAN_REVIEW' as const,
      proposedRecipe: 'PACK_COMPOSED' as const,
      proposedPackHeadings: [...pack.headings],
      score: pack.score,
      note: `${packAlignment.note} Per ${item.blockId}: ${pack.headings.join(' + ')}. Piano mantiene durata ed evidenza; il PACK fornisce i passaggi operativi.`,
    }
  })

  return {
    ...base,
    compilerVersion: 2,
    status: 'READY_FOR_HUMAN_REVIEW',
    items,
    packAlignment,
    issues: base.issues.filter((issue) => !/allocazione semantica competitiva delle fasi UDA/i.test(issue)),
  }
}
