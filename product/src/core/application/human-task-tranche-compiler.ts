import { buildBlocks, type AnnualPlanBlock, type GradeKey } from '@/app/piano-annuale/model'
import {
  compileHumanTaskContentCandidate,
  type ExtractedUdaPhase,
  type HumanTaskContentCandidate,
  type HumanTaskPipelineSource,
} from './human-task-content-pipeline'

const AMBIGUITY_MARGIN = 0.5
const MAX_ASSIGNMENTS = 50_000

export type HumanTaskCompilerRecipe = 'PLAN_GUIDED_UDA' | 'UNRESOLVED'

export type HumanTaskTrancheCompilerItem = {
  blockId: string
  title: string
  status: 'READY_FOR_HUMAN_REVIEW' | 'AMBIGUOUS_SOURCE_ALIGNMENT' | 'BLOCKED'
  proposedRecipe: HumanTaskCompilerRecipe
  proposedPhaseOrdinals: number[]
  alternativePhaseSets: number[][]
  score: number | null
  note: string
}

export type HumanTaskPhaseAllocation = {
  score: number
  blocks: Array<{
    blockId: string
    phaseOrdinals: number[]
    score: number
  }>
}

export type HumanTaskTrancheCompilerReview = {
  compilerVersion: 1
  grade: GradeKey
  segmentKey: string | null
  blockIds: string[]
  status: 'COMPLETE' | 'BLOCKED' | 'READY_FOR_HUMAN_REVIEW' | 'AMBIGUOUS_SOURCE_ALIGNMENT'
  promotion: 'NONE' | 'HUMAN_REVIEW_REQUIRED'
  sourceBindings: Array<{
    code: string
    assetId: string
    generationId: string
  }>
  candidateIds: string[]
  items: HumanTaskTrancheCompilerItem[]
  recommendedAllocation: HumanTaskPhaseAllocation | null
  alternativeAllocations: HumanTaskPhaseAllocation[]
  issues: string[]
}

export type CompileHumanTaskTrancheInput = {
  grade: GradeKey
  coveredBlockIds: Iterable<string>
  sources: HumanTaskPipelineSource[]
}

export function discoverNextHumanTaskTranche(grade: GradeKey, coveredBlockIds: Iterable<string>): AnnualPlanBlock[] {
  const covered = new Set(Array.from(coveredBlockIds, (value) => value.toUpperCase()))
  const blocks = buildBlocks(grade)
  const firstUncovered = blocks.find((block) => !covered.has(block.id))
  if (!firstUncovered) return []

  return blocks.filter((block) => block.segmentKey === firstUncovered.segmentKey && !covered.has(block.id))
}

export function compileHumanTaskTrancheReview(input: CompileHumanTaskTrancheInput): HumanTaskTrancheCompilerReview {
  const tranche = discoverNextHumanTaskTranche(input.grade, input.coveredBlockIds)
  if (!tranche.length) return completeReview(input.grade)

  const sourceMap = new Map<string, HumanTaskPipelineSource>()
  const duplicateCodes = new Set<string>()
  for (const source of input.sources) {
    if (sourceMap.has(source.code)) duplicateCodes.add(source.code)
    sourceMap.set(source.code, source)
  }

  if (duplicateCodes.size) {
    return blockedReview(
      input.grade,
      tranche,
      [],
      input.sources,
      [`Sorgenti correnti duplicate per codice: ${Array.from(duplicateCodes).sort().join(', ')}.`],
    )
  }

  const candidates = tranche.map((block) => compileHumanTaskContentCandidate(input.grade, block.id, {
    uda: sourceMap.get(`CAN-UDA-${block.uda}`) ?? null,
    pack: sourceMap.get(block.pack) ?? null,
    supportPacks: block.supportPacks.flatMap((code) => {
      const source = sourceMap.get(code)
      return source ? [source] : []
    }),
  }))

  const blockedCandidates = candidates.filter((candidate) => candidate.gate.status === 'BLOCKED')
  if (blockedCandidates.length) {
    return blockedReview(
      input.grade,
      tranche,
      candidates,
      input.sources,
      blockedCandidates.flatMap((candidate) => candidate.gate.issues
        .filter((issue) => issue.severity === 'BLOCKING')
        .map((issue) => `${candidate.blockId}: ${issue.message}`)),
    )
  }

  const uda = candidates[0]?.evidence.uda ?? null
  if (!uda?.phases.length) {
    return unresolvedReview(
      input.grade,
      tranche,
      candidates,
      input.sources,
      'La tranche non espone fasi UDA temporizzate: il classificatore automatico PLAN_GUIDED_UDA non può provare una copertura esatta.',
    )
  }

  const sameUda = candidates.every((candidate) => candidate.block.udaCode === candidates[0].block.udaCode)
  const sameSegment = candidates.every((candidate) => candidate.block.segmentKey === candidates[0].block.segmentKey)
  if (!sameUda || !sameSegment) {
    return unresolvedReview(
      input.grade,
      tranche,
      candidates,
      input.sources,
      'La tranche scoperta non appartiene a un singolo segmento/UDA coerente.',
    )
  }

  const segmentBlocks = buildBlocks(input.grade).filter((block) => block.segmentKey === tranche[0].segmentKey)
  if (segmentBlocks.length !== tranche.length) {
    return unresolvedReview(
      input.grade,
      tranche,
      candidates,
      input.sources,
      'Il segmento è già parzialmente coperto: l’allocazione automatica delle fasi richiede il binding delle proiezioni già approvate.',
    )
  }

  const expectedMinutes = tranche.reduce((total, block) => total + block.hours * 60, 0)
  const phaseMinutes = uda.phases.reduce((total, phase) => total + phase.durationMinutes, 0)
  if (expectedMinutes !== phaseMinutes) {
    return unresolvedReview(
      input.grade,
      tranche,
      candidates,
      input.sources,
      `Le fasi UDA coprono ${phaseMinutes} minuti, mentre il segmento canonico ne richiede ${expectedMinutes}.`,
    )
  }

  const allocations = rankExactPhaseAllocations(tranche, uda.phases)
  if (!allocations.length) {
    return unresolvedReview(
      input.grade,
      tranche,
      candidates,
      input.sources,
      'Nessuna allocazione usa ogni fase una sola volta rispettando esattamente la durata di tutti i blocchi.',
    )
  }

  const best = allocations[0]
  const competitive = allocations.filter((allocation) => best.score - allocation.score < AMBIGUITY_MARGIN)
  const items = tranche.map((block) => {
    const recommended = best.blocks.find((item) => item.blockId === block.id)
    const phaseSets = uniquePhaseSets(competitive.flatMap((allocation) => {
      const item = allocation.blocks.find((candidate) => candidate.blockId === block.id)
      return item ? [item.phaseOrdinals] : []
    }))
    const stable = phaseSets.length === 1

    return {
      blockId: block.id,
      title: block.title,
      status: stable ? 'READY_FOR_HUMAN_REVIEW' : 'AMBIGUOUS_SOURCE_ALIGNMENT',
      proposedRecipe: stable ? 'PLAN_GUIDED_UDA' : 'UNRESOLVED',
      proposedPhaseOrdinals: recommended?.phaseOrdinals ?? [],
      alternativePhaseSets: phaseSets,
      score: recommended?.score ?? null,
      note: stable
        ? `Le allocazioni competitive concordano sulle fasi ${formatOrdinals(recommended?.phaseOrdinals ?? [])}. La proposta resta soggetta a revisione umana.`
        : `Le migliori allocazioni non concordano: ${phaseSets.map(formatOrdinals).join(' oppure ')}. Serve una decisione semantica prima del Recipe.`,
    } satisfies HumanTaskTrancheCompilerItem
  })

  const ambiguous = items.some((item) => item.status === 'AMBIGUOUS_SOURCE_ALIGNMENT')
  return {
    compilerVersion: 1,
    grade: input.grade,
    segmentKey: tranche[0].segmentKey,
    blockIds: tranche.map((block) => block.id),
    status: ambiguous ? 'AMBIGUOUS_SOURCE_ALIGNMENT' : 'READY_FOR_HUMAN_REVIEW',
    promotion: 'HUMAN_REVIEW_REQUIRED',
    sourceBindings: sourceBindings(input.sources),
    candidateIds: candidates.map((candidate) => candidate.candidateId),
    items,
    recommendedAllocation: best,
    alternativeAllocations: allocations.slice(1, 4),
    issues: ambiguous
      ? ['La tranche è strutturalmente valida, ma almeno un blocco ha più di una allocazione semantica competitiva delle fasi UDA.']
      : [],
  }
}

function rankExactPhaseAllocations(blocks: AnnualPlanBlock[], phases: ExtractedUdaPhase[]): HumanTaskPhaseAllocation[] {
  const tokenFrequency = phaseTokenFrequency(phases)
  const assignments: HumanTaskPhaseAllocation[] = []
  const buckets = blocks.map(() => [] as ExtractedUdaPhase[])
  const usedMinutes = blocks.map(() => 0)
  let exhausted = false

  function visit(phaseIndex: number) {
    if (assignments.length >= MAX_ASSIGNMENTS) {
      exhausted = true
      return
    }
    if (phaseIndex >= phases.length) {
      if (usedMinutes.every((minutes, index) => minutes === blocks[index].hours * 60)) {
        assignments.push(scoreAllocation(blocks, buckets, tokenFrequency))
      }
      return
    }

    const phase = phases[phaseIndex]
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const capacity = blocks[blockIndex].hours * 60
      if (usedMinutes[blockIndex] + phase.durationMinutes > capacity) continue
      buckets[blockIndex].push(phase)
      usedMinutes[blockIndex] += phase.durationMinutes
      visit(phaseIndex + 1)
      usedMinutes[blockIndex] -= phase.durationMinutes
      buckets[blockIndex].pop()
      if (exhausted) return
    }
  }

  visit(0)
  return assignments
    .sort((left, right) => right.score - left.score || allocationSignature(left).localeCompare(allocationSignature(right)))
}

function scoreAllocation(
  blocks: AnnualPlanBlock[],
  buckets: ExtractedUdaPhase[][],
  tokenFrequency: Map<string, number>,
): HumanTaskPhaseAllocation {
  const scoredBlocks = blocks.map((block, index) => {
    const phases = buckets[index]
    const score = round(phases.reduce((total, phase) => total + phaseBlockScore(block, phase, tokenFrequency), 0))
    return {
      blockId: block.id,
      phaseOrdinals: phases.map((phase) => phase.ordinal).sort((a, b) => a - b),
      score,
    }
  })
  return {
    score: round(scoredBlocks.reduce((total, item) => total + item.score, 0)),
    blocks: scoredBlocks,
  }
}

function phaseBlockScore(block: AnnualPlanBlock, phase: ExtractedUdaPhase, tokenFrequency: Map<string, number>) {
  const blockTokens = stems(block.title)
  const titleTokens = stems(phase.title)
  const contentTokens = stems(phase.content)
  let score = 0

  for (const token of blockTokens) {
    const weight = 1 / (tokenFrequency.get(token) ?? 1)
    if (titleTokens.has(token)) score += 2 * weight
    else if (contentTokens.has(token)) score += weight
  }
  return score
}

function phaseTokenFrequency(phases: ExtractedUdaPhase[]) {
  const frequency = new Map<string, number>()
  for (const phase of phases) {
    for (const token of stems(`${phase.title} ${phase.content}`)) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1)
    }
  }
  return frequency
}

function stems(value: string) {
  const stop = new Set([
    'alla', 'alle', 'agli', 'allo', 'anche', 'come', 'dai', 'dal', 'dalla', 'dalle', 'dei', 'del', 'della', 'delle',
    'degli', 'dello', 'fase', 'nell', 'nella', 'nelle', 'sono', 'una', 'uno', 'utilizzo', 'utilizzare', 'semplice', 'semplici',
  ])
  const normalized = value
    .replace(/[’']/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stop.has(token))
    .map((token) => token.length >= 6 ? token.slice(0, 5) : token)
  return new Set(normalized)
}

function uniquePhaseSets(values: number[][]) {
  const map = new Map(values.map((value) => {
    const normalized = [...value].sort((a, b) => a - b)
    return [normalized.join(','), normalized]
  }))
  return Array.from(map.values()).sort((a, b) => a.join(',').localeCompare(b.join(',')))
}

function allocationSignature(allocation: HumanTaskPhaseAllocation) {
  return allocation.blocks.map((block) => `${block.blockId}:${block.phaseOrdinals.join(',')}`).join('|')
}

function formatOrdinals(values: number[]) {
  return values.length ? `F${values.join('+F')}` : 'nessuna fase'
}

function round(value: number) {
  return Number(value.toFixed(3))
}

function sourceBindings(sources: HumanTaskPipelineSource[]) {
  return [...sources]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((source) => ({ code: source.code, assetId: source.assetId, generationId: source.generationId }))
}

function completeReview(grade: GradeKey): HumanTaskTrancheCompilerReview {
  return {
    compilerVersion: 1,
    grade,
    segmentKey: null,
    blockIds: [],
    status: 'COMPLETE',
    promotion: 'NONE',
    sourceBindings: [],
    candidateIds: [],
    items: [],
    recommendedAllocation: null,
    alternativeAllocations: [],
    issues: [],
  }
}

function blockedReview(
  grade: GradeKey,
  tranche: AnnualPlanBlock[],
  candidates: HumanTaskContentCandidate[],
  sources: HumanTaskPipelineSource[],
  issues: string[],
): HumanTaskTrancheCompilerReview {
  return {
    compilerVersion: 1,
    grade,
    segmentKey: tranche[0]?.segmentKey ?? null,
    blockIds: tranche.map((block) => block.id),
    status: 'BLOCKED',
    promotion: 'HUMAN_REVIEW_REQUIRED',
    sourceBindings: sourceBindings(sources),
    candidateIds: candidates.map((candidate) => candidate.candidateId),
    items: tranche.map((block) => ({
      blockId: block.id,
      title: block.title,
      status: 'BLOCKED',
      proposedRecipe: 'UNRESOLVED',
      proposedPhaseOrdinals: [],
      alternativePhaseSets: [],
      score: null,
      note: 'La pipeline sorgenti non ha superato il gate strutturale.',
    })),
    recommendedAllocation: null,
    alternativeAllocations: [],
    issues,
  }
}

function unresolvedReview(
  grade: GradeKey,
  tranche: AnnualPlanBlock[],
  candidates: HumanTaskContentCandidate[],
  sources: HumanTaskPipelineSource[],
  issue: string,
): HumanTaskTrancheCompilerReview {
  return {
    compilerVersion: 1,
    grade,
    segmentKey: tranche[0]?.segmentKey ?? null,
    blockIds: tranche.map((block) => block.id),
    status: 'AMBIGUOUS_SOURCE_ALIGNMENT',
    promotion: 'HUMAN_REVIEW_REQUIRED',
    sourceBindings: sourceBindings(sources),
    candidateIds: candidates.map((candidate) => candidate.candidateId),
    items: tranche.map((block) => ({
      blockId: block.id,
      title: block.title,
      status: 'AMBIGUOUS_SOURCE_ALIGNMENT',
      proposedRecipe: 'UNRESOLVED',
      proposedPhaseOrdinals: [],
      alternativePhaseSets: [],
      score: null,
      note: issue,
    })),
    recommendedAllocation: null,
    alternativeAllocations: [],
    issues: [issue],
  }
}
