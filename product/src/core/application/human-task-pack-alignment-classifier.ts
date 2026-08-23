import type { AnnualPlanBlock } from '@/app/piano-annuale/model'
import type { ExtractedPackSection, HumanTaskContentCandidate } from './human-task-content-pipeline'

const DEFAULT_AMBIGUITY_MARGIN = 0.5

export type HumanTaskCompilerPlanFragment = {
  blockId: string
  activity: string
  evidence: string
}

export type HumanTaskPackAllocation = {
  score: number
  blocks: Array<{
    blockId: string
    headings: string[]
    score: number
  }>
}

export type HumanTaskPackAlignmentResult = {
  status: 'NOT_APPLICABLE' | 'READY' | 'AMBIGUOUS'
  recommended: HumanTaskPackAllocation | null
  alternatives: HumanTaskPackAllocation[]
  note: string
}

/**
 * Classifies an ordered operational PACK against a canonical tranche.
 *
 * The classifier is deliberately conservative:
 * - only numbered operational-path headings are eligible;
 * - every operational heading must be assigned exactly once;
 * - each block receives at least one contiguous heading group;
 * - ordering is preserved;
 * - Plan activity is used only as matching context, never as invented PACK text;
 * - ambiguous partitions remain human-review work.
 */
export function classifyOrderedPackAlignment(input: {
  blocks: AnnualPlanBlock[]
  candidates: HumanTaskContentCandidate[]
  planFragments: HumanTaskCompilerPlanFragment[]
  ambiguityMargin?: number
}): HumanTaskPackAlignmentResult {
  const { blocks, candidates } = input
  if (!blocks.length || blocks.length !== candidates.length) {
    return notApplicable('La tranche o i candidati non sono coerenti per una classificazione PACK ordinata.')
  }

  const fragmentByBlock = new Map(input.planFragments.map((fragment) => [fragment.blockId.toUpperCase(), fragment]))
  if (blocks.some((block) => !fragmentByBlock.has(block.id))) {
    return notApplicable('Manca il frammento Piano attività/evidenza per almeno un blocco della tranche.')
  }

  const packCode = blocks[0].pack
  if (blocks.some((block) => block.pack !== packCode)) {
    return notApplicable('La tranche usa più pacchetti principali: il classificatore PACK ordinato non è applicabile.')
  }

  const firstPack = candidates[0]?.evidence.pack
  if (!firstPack || firstPack.code !== packCode) {
    return notApplicable(`Il pacchetto ${packCode} non è estraibile nel candidato corrente.`)
  }
  if (candidates.some((candidate) => candidate.evidence.pack?.code !== packCode)) {
    return notApplicable('I candidati non condividono la stessa estrazione PACK corrente.')
  }

  const operational = firstPack.sections.filter(isOperationalPathSection)
  if (operational.length < blocks.length) {
    return notApplicable(`Il pacchetto ${packCode} espone ${operational.length} passaggi operativi numerati per ${blocks.length} blocchi.`)
  }

  const allocations = enumerateContiguousPartitions(blocks, operational, fragmentByBlock)
  if (!allocations.length) return notApplicable('Nessuna partizione contigua del percorso PACK copre l’intera tranche.')

  const best = allocations[0]
  const margin = input.ambiguityMargin ?? DEFAULT_AMBIGUITY_MARGIN
  const competitive = allocations.filter((allocation) => best.score - allocation.score < margin)
  const stable = blocks.every((block) => {
    const signatures = new Set(competitive.map((allocation) => {
      const item = allocation.blocks.find((entry) => entry.blockId === block.id)
      return item?.headings.join('|') ?? ''
    }))
    return signatures.size === 1
  })

  return {
    status: stable ? 'READY' : 'AMBIGUOUS',
    recommended: best,
    alternatives: competitive.slice(1, 4),
    note: stable
      ? `Il percorso operativo ${packCode} ammette una partizione ordinata stabile sui ${blocks.length} blocchi.`
      : `Più partizioni del percorso operativo ${packCode} restano semanticamente competitive; serve revisione umana.`,
  }
}

function isOperationalPathSection(section: ExtractedPackSection) {
  return /^\d+\.\s+/.test(section.heading)
    && section.kind === 'OTHER'
    && section.content.trim().length > 0
}

function enumerateContiguousPartitions(
  blocks: AnnualPlanBlock[],
  sections: ExtractedPackSection[],
  fragmentByBlock: Map<string, HumanTaskCompilerPlanFragment>,
) {
  const cuts: number[][] = []
  chooseCuts(1, sections.length, blocks.length - 1, [], cuts)

  return cuts.map((selectedCuts) => {
    const boundaries = [0, ...selectedCuts, sections.length]
    const assigned = blocks.map((block, index) => {
      const group = sections.slice(boundaries[index], boundaries[index + 1])
      const fragment = fragmentByBlock.get(block.id)!
      const score = round(group.reduce((total, section) => total + sectionBlockScore(block, fragment, section), 0))
      return {
        blockId: block.id,
        headings: group.map((section) => section.heading),
        score,
      }
    })
    return {
      score: round(assigned.reduce((total, item) => total + item.score, 0)),
      blocks: assigned,
    } satisfies HumanTaskPackAllocation
  }).sort((left, right) => right.score - left.score || signature(left).localeCompare(signature(right)))
}

function chooseCuts(
  next: number,
  sectionCount: number,
  remaining: number,
  selected: number[],
  output: number[][],
) {
  if (remaining === 0) {
    output.push([...selected])
    return
  }
  const lastAllowed = sectionCount - remaining
  for (let cut = next; cut <= lastAllowed; cut += 1) {
    selected.push(cut)
    chooseCuts(cut + 1, sectionCount, remaining - 1, selected, output)
    selected.pop()
  }
}

function sectionBlockScore(
  block: AnnualPlanBlock,
  fragment: HumanTaskCompilerPlanFragment,
  section: ExtractedPackSection,
) {
  const context = stems(`${block.title} ${fragment.activity} ${fragment.evidence}`)
  const heading = stems(section.heading)
  const body = stems(section.content)
  let score = 0
  for (const token of context) {
    if (heading.has(token)) score += 3
    else if (body.has(token)) score += 1
  }
  return score
}

function stems(value: string) {
  const stop = new Set([
    'alla', 'alle', 'agli', 'allo', 'anche', 'come', 'dai', 'dal', 'dalla', 'dalle', 'dei', 'del', 'della', 'delle',
    'degli', 'dello', 'dati', 'delle', 'evidenza', 'fase', 'nella', 'nelle', 'sono', 'una', 'uno', 'semplice', 'semplici',
  ])
  const tokens = value
    .replace(/[’']/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stop.has(token))
    .map((token) => token.length >= 7 ? token.slice(0, 6) : token)
  return new Set(tokens)
}

function signature(allocation: HumanTaskPackAllocation) {
  return allocation.blocks.map((block) => `${block.blockId}:${block.headings.join('>')}`).join('|')
}

function round(value: number) {
  return Number(value.toFixed(3))
}

function notApplicable(note: string): HumanTaskPackAlignmentResult {
  return { status: 'NOT_APPLICABLE', recommended: null, alternatives: [], note }
}
