import { buildBlocks, type GradeKey } from '@/app/piano-annuale/model'
import {
  compileHumanTaskContentCandidate,
  type ExtractedPackSection,
  type HumanTaskContentCandidate,
  type HumanTaskPipelineSource,
} from './human-task-content-pipeline'
import {
  compileHumanTaskTrancheReview,
  discoverNextHumanTaskTranche,
  type HumanTaskTrancheCompilerItem,
  type HumanTaskTrancheCompilerReview,
} from './human-task-tranche-compiler'

export type HumanTaskDirectCompilerRecipe = 'DIRECT' | 'PLAN_GUIDED_UDA' | 'UNRESOLVED'

export type HumanTaskDirectCompilerItem = Omit<HumanTaskTrancheCompilerItem, 'proposedRecipe'> & {
  proposedRecipe: HumanTaskDirectCompilerRecipe
  proposedPackHeadings: string[]
}

export type HumanTaskDirectAlignmentBlock = {
  blockId: string
  heading: string
  sectionOrdinal: number
  durationMinutes: number
  activity: string
  product: string
  evidence: string
}

export type HumanTaskDirectAlignment = {
  status: 'READY' | 'NOT_APPLICABLE' | 'BLOCKED'
  packCode: string | null
  blocks: HumanTaskDirectAlignmentBlock[]
  note: string
}

export type HumanTaskDirectTrancheReview = Omit<
  HumanTaskTrancheCompilerReview,
  'compilerVersion' | 'items' | 'status'
> & {
  compilerVersion: 3
  status: HumanTaskTrancheCompilerReview['status']
  items: HumanTaskDirectCompilerItem[]
  directAlignment: HumanTaskDirectAlignment
}

export type CompileDirectHumanTaskTrancheInput = {
  grade: GradeKey
  coveredBlockIds: Iterable<string>
  sources: HumanTaskPipelineSource[]
}

export type ExplicitPackSetTiming =
  | { status: 'NONE'; lessonCount: null; durationMinutes: null; note: string }
  | { status: 'READY'; lessonCount: number; durationMinutes: number; note: string }
  | { status: 'INVALID'; lessonCount: number | null; durationMinutes: number | null; note: string }

/**
 * Compiler v3 adds the strongest PACK case: one explicit operational lesson
 * maps to one canonical two-hour block in source order. DIRECT is proposed
 * only when timing, activity, product and evidence are all documented by the
 * PACK. Timing may be written on each lesson or once for the whole set using
 * an explicit grammar such as “4 lezioni da 2 ore”; it is never inferred from
 * the Plan alone. A non phase-structured UDA is tolerated only for this exact
 * case; any other blocking source problem remains fail-closed.
 */
export function compileHumanTaskTrancheReviewWithDirectPack(
  input: CompileDirectHumanTaskTrancheInput,
): HumanTaskDirectTrancheReview {
  const base = compileHumanTaskTrancheReview(input)
  const defaultItems = base.items.map((item) => ({
    ...item,
    proposedRecipe: item.proposedRecipe,
    proposedPackHeadings: [],
  } satisfies HumanTaskDirectCompilerItem))

  const tranche = discoverNextHumanTaskTranche(input.grade, input.coveredBlockIds)
  if (!tranche.length) {
    return {
      ...base,
      compilerVersion: 3,
      items: defaultItems,
      directAlignment: {
        status: 'NOT_APPLICABLE',
        packCode: null,
        blocks: [],
        note: 'Nessuna tranche residua: il grado è già coperto dal runtime corrente.',
      },
    }
  }

  const duplicateCodes = duplicatedSourceCodes(input.sources)
  if (duplicateCodes.length) {
    return fallback(base, defaultItems, {
      status: 'BLOCKED',
      packCode: null,
      blocks: [],
      note: `Sorgenti duplicate: ${duplicateCodes.join(', ')}. Il raccordo DIRECT non può scegliere una versione implicitamente.`,
    })
  }

  const sourceMap = new Map(input.sources.map((source) => [source.code, source]))
  const candidates = tranche.map((block) => compileHumanTaskContentCandidate(input.grade, block.id, {
    uda: sourceMap.get(`CAN-UDA-${block.uda}`) ?? null,
    pack: sourceMap.get(block.pack) ?? null,
    supportPacks: block.supportPacks.flatMap((code) => {
      const source = sourceMap.get(code)
      return source ? [source] : []
    }),
  }))

  if (!sameDirectSegment(candidates)) {
    return fallback(base, defaultItems, {
      status: 'NOT_APPLICABLE',
      packCode: null,
      blocks: [],
      note: 'La tranche non usa un unico PACK principale e una sola UDA: DIRECT 1:1 non è applicabile.',
    })
  }

  const disallowedBlockingIssues = candidates.flatMap((candidate) => candidate.gate.issues
    .filter((issue) => issue.severity === 'BLOCKING' && issue.code !== 'UDA_PARSE_EMPTY')
    .map((issue) => `${candidate.blockId}: ${issue.message}`))
  if (disallowedBlockingIssues.length) {
    return fallback(base, defaultItems, {
      status: 'BLOCKED',
      packCode: candidates[0]?.block.packCode ?? null,
      blocks: [],
      note: `Il raccordo DIRECT non può derogare a problemi di identità o disponibilità delle fonti: ${disallowedBlockingIssues.join(' ')}`,
    })
  }

  const udaParseOnly = candidates.every((candidate) => candidate.gate.issues
    .filter((issue) => issue.severity === 'BLOCKING')
    .every((issue) => issue.code === 'UDA_PARSE_EMPTY'))
  if (!udaParseOnly) {
    return fallback(base, defaultItems, {
      status: 'BLOCKED',
      packCode: candidates[0]?.block.packCode ?? null,
      blocks: [],
      note: 'Il raccordo DIRECT ha incontrato un blocco sorgente non classificabile come sola assenza di fasi UDA temporizzate.',
    })
  }

  const packCode = candidates[0].block.packCode
  const pack = candidates[0].evidence.pack
  const lessonSections = pack?.sections.filter(isExplicitLessonSection) ?? []
  if (lessonSections.length !== tranche.length) {
    return fallback(base, defaultItems, {
      status: 'NOT_APPLICABLE',
      packCode,
      blocks: [],
      note: `Il PACK espone ${lessonSections.length} lezioni operative esplicite per ${tranche.length} blocchi: non esiste un raccordo DIRECT 1:1 completo.`,
    })
  }

  const packSource = sourceMap.get(packCode)
  const setTiming = resolveExplicitPackSetTiming(packSource?.normalizedText ?? '', tranche.length)
  if (setTiming.status === 'INVALID') {
    return fallback(base, defaultItems, {
      status: 'BLOCKED',
      packCode,
      blocks: [],
      note: setTiming.note,
    })
  }

  const directBlocks: HumanTaskDirectAlignmentBlock[] = []
  const setTimedBlockIds: string[] = []
  for (let index = 0; index < tranche.length; index += 1) {
    const block = tranche[index]
    const section = lessonSections[index]
    const lessonNumber = explicitLessonNumber(section.heading)
    const sectionDurationMinutes = explicitPackSectionDurationMinutes(section)
    const durationMinutes = sectionDurationMinutes ?? (setTiming.status === 'READY' ? setTiming.durationMinutes : null)
    const activity = section.activity?.trim() ?? ''
    const product = section.product?.trim() ?? ''
    const evidence = explicitPackSectionEvidence(section)

    if (lessonNumber !== index + 1) {
      return fallback(base, defaultItems, {
        status: 'BLOCKED',
        packCode,
        blocks: [],
        note: `La sequenza delle lezioni PACK non è continua: attesa Lezione ${index + 1}, trovata ${section.heading}.`,
      })
    }
    if (durationMinutes !== block.hours * 60) {
      return fallback(base, defaultItems, {
        status: 'BLOCKED',
        packCode,
        blocks: [],
        note: `${section.heading} non documenta esattamente ${block.hours * 60} minuti né nella lezione né in una dichiarazione esplicita valida dell’intero set; la durata non viene inferita.`,
      })
    }
    if (!activity || !product || !evidence) {
      return fallback(base, defaultItems, {
        status: 'BLOCKED',
        packCode,
        blocks: [],
        note: `${section.heading} non contiene contemporaneamente Attività, Prodotto ed Evidenza/Evidenze: DIRECT richiede tutti e tre i campi documentati.`,
      })
    }
    if (sectionDurationMinutes === null) setTimedBlockIds.push(block.id)

    directBlocks.push({
      blockId: block.id,
      heading: section.heading,
      sectionOrdinal: section.ordinal,
      durationMinutes,
      activity,
      product,
      evidence,
    })
  }

  const byBlock = new Map(directBlocks.map((item) => [item.blockId, item]))
  const items: HumanTaskDirectCompilerItem[] = tranche.map((block) => {
    const direct = byBlock.get(block.id)
    if (!direct) throw new Error(`Raccordo DIRECT incompleto per ${block.id}.`)
    const timingNote = setTimedBlockIds.includes(block.id)
      ? 'La durata è dichiarata esplicitamente dall’articolazione complessiva del PACK.'
      : 'La durata è dichiarata esplicitamente nella singola lezione.'
    return {
      blockId: block.id,
      title: block.title,
      status: 'READY_FOR_HUMAN_REVIEW',
      proposedRecipe: 'DIRECT',
      proposedPhaseOrdinals: [],
      alternativePhaseSets: [],
      score: null,
      proposedPackHeadings: [direct.heading],
      note: `${direct.heading} copre esattamente il blocco da ${direct.durationMinutes} minuti e documenta attività, prodotto ed evidenza. ${timingNote} La proposta resta soggetta a revisione umana e al gate cognitivo degli stakeholder.`,
    }
  })

  const timingProvenance = setTimedBlockIds.length
    ? ` Per ${setTimedBlockIds.join(', ')} la durata deriva dalla dichiarazione esplicita del set “${setTiming.status === 'READY' ? `${setTiming.lessonCount} lezioni da ${setTiming.durationMinutes / 60} ore` : ''}”, non da inferenza.`
    : ''

  return {
    compilerVersion: 3,
    grade: input.grade,
    segmentKey: tranche[0].segmentKey,
    blockIds: tranche.map((block) => block.id),
    status: 'READY_FOR_HUMAN_REVIEW',
    promotion: 'HUMAN_REVIEW_REQUIRED',
    sourceBindings: sourceBindings(input.sources),
    candidateIds: candidates.map((candidate) => candidate.candidateId),
    items,
    recommendedAllocation: null,
    alternativeAllocations: [],
    issues: [],
    directAlignment: {
      status: 'READY',
      packCode,
      blocks: directBlocks,
      note: `Raccordo DIRECT documentato: il Piano mantiene ordine e durata del segmento; il PACK fornisce lezioni operative 1:1; la UDA resta sorgente semantica e valutativa anche quando non espone fasi temporizzate estraibili.${timingProvenance}`,
    },
  }
}

export function explicitPackSectionDurationMinutes(section: ExtractedPackSection): number | null {
  if (section.durationMinutes !== null) return section.durationMinutes
  const match = section.heading.match(/[—-]\s*(\d+(?:[.,]\d+)?)\s*ore?\s*$/i)
  if (!match) return null
  const hours = Number(match[1].replace(',', '.'))
  return Number.isFinite(hours) && hours > 0 ? hours * 60 : null
}

/**
 * Reads only a closed, explicit set-level grammar. The declaration is usable
 * only when its lesson count exactly equals the discovered tranche. Multiple
 * declarations or count mismatches are treated as ambiguity and block DIRECT.
 */
export function resolveExplicitPackSetTiming(normalizedText: string, expectedLessonCount: number): ExplicitPackSetTiming {
  const matches = Array.from(normalizedText.matchAll(/(?:ARTICOLAZIONE\s*[—–-]\s*)?(\d+)\s+LEZIONI\s+DA\s+(\d+(?:[.,]\d+)?)\s*ORE?\b/giu))
  if (!matches.length) {
    return { status: 'NONE', lessonCount: null, durationMinutes: null, note: 'Nessuna temporizzazione esplicita del set trovata.' }
  }
  if (matches.length !== 1) {
    return { status: 'INVALID', lessonCount: null, durationMinutes: null, note: 'Il PACK contiene più dichiarazioni di temporizzazione del set: DIRECT non sceglie implicitamente quale usare.' }
  }

  const lessonCount = Number(matches[0][1])
  const hours = Number(matches[0][2].replace(',', '.'))
  const durationMinutes = Number.isFinite(hours) && hours > 0 ? hours * 60 : null
  if (!Number.isInteger(lessonCount) || lessonCount !== expectedLessonCount || durationMinutes === null) {
    return {
      status: 'INVALID',
      lessonCount: Number.isFinite(lessonCount) ? lessonCount : null,
      durationMinutes,
      note: `La temporizzazione esplicita del set dichiara ${lessonCount} lezioni per ${expectedLessonCount} blocchi oppure una durata non valida: DIRECT resta bloccato.`,
    }
  }

  return {
    status: 'READY',
    lessonCount,
    durationMinutes,
    note: `Temporizzazione esplicita del set verificata: ${lessonCount} lezioni da ${hours} ore.`,
  }
}

function explicitPackSectionEvidence(section: ExtractedPackSection) {
  const singular = section.evidence?.trim()
  if (singular) return singular
  const match = section.content.match(/(?:^|\n)Evidenze\s*:\s*([^\n]+)/i)
  return match?.[1]?.trim() ?? ''
}

function isExplicitLessonSection(section: ExtractedPackSection) {
  return section.kind === 'TEACHER_GUIDE' && explicitLessonNumber(section.heading) !== null
}

function explicitLessonNumber(heading: string): number | null {
  const normalized = heading.replace(/^\d+\.\s+/, '').trim()
  const match = normalized.match(/^LEZIONE\s+(\d+)\b/i)
  return match ? Number(match[1]) : null
}

function sameDirectSegment(candidates: HumanTaskContentCandidate[]) {
  if (!candidates.length) return false
  const first = candidates[0]
  return candidates.every((candidate) => candidate.block.segmentKey === first.block.segmentKey
    && candidate.block.udaCode === first.block.udaCode
    && candidate.block.packCode === first.block.packCode)
}

function duplicatedSourceCodes(sources: HumanTaskPipelineSource[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const source of sources) {
    if (seen.has(source.code)) duplicates.add(source.code)
    seen.add(source.code)
  }
  return [...duplicates].sort()
}

function sourceBindings(sources: HumanTaskPipelineSource[]) {
  return [...sources]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((source) => ({ code: source.code, assetId: source.assetId, generationId: source.generationId }))
}

function fallback(
  base: HumanTaskTrancheCompilerReview,
  items: HumanTaskDirectCompilerItem[],
  directAlignment: HumanTaskDirectAlignment,
): HumanTaskDirectTrancheReview {
  return {
    ...base,
    compilerVersion: 3,
    items,
    directAlignment,
  }
}

/** Structural smoke guard: a DIRECT segment must still exist in the Plan. */
export function hasCanonicalDirectSegment(grade: GradeKey, segmentKey: string) {
  return buildBlocks(grade).some((block) => block.segmentKey === segmentKey)
}
