import { buildBlocks, CANONICAL_PLAN_SOURCES, type GradeKey } from '@/app/piano-annuale/model'

export type HumanTaskPipelineSourceRole = 'UDA' | 'PACK'

export type HumanTaskPipelineSource = {
  code: string
  assetId: string
  generationId: string
  title: string | null
  normalizedText: string
}

export interface HumanTaskContentSourcePort {
  getCurrentByCanonicalCode(workspaceId: string, code: string): Promise<HumanTaskPipelineSource | null>
}

export type ExtractedUdaHour = {
  ordinal: number
  title: string
  content: string
}

export type ExtractedUda = {
  code: string
  title: string | null
  durationHours: number | null
  hours: ExtractedUdaHour[]
}

export type PackSectionKind =
  | 'TEACHER_GUIDE'
  | 'STUDENT_SHEET'
  | 'OBSERVATION_TOOL'
  | 'TASK_BRIEF'
  | 'RUBRIC'
  | 'CHECKLIST'
  | 'ADAPTATION_GUIDANCE'
  | 'OTHER'

export type ExtractedPackSection = {
  ordinal: number
  heading: string
  kind: PackSectionKind
  content: string
  durationMinutes: number | null
  objective: string | null
  listItems: string[]
}

export type ExtractedPack = {
  code: string
  title: string | null
  sections: ExtractedPackSection[]
}

export type HumanTaskPipelineIssueCode =
  | 'BLOCK_NOT_FOUND'
  | 'UDA_SOURCE_MISSING'
  | 'PACK_SOURCE_MISSING'
  | 'UDA_SOURCE_CODE_MISMATCH'
  | 'PACK_SOURCE_CODE_MISMATCH'
  | 'UDA_PARSE_EMPTY'
  | 'PACK_PARSE_EMPTY'
  | 'UDA_HOUR_WINDOW_AMBIGUOUS'

export type HumanTaskPipelineIssue = {
  code: HumanTaskPipelineIssueCode
  severity: 'BLOCKING' | 'REVIEW'
  message: string
}

export type HumanTaskPackMatch = {
  sectionOrdinal: number
  heading: string
  kind: PackSectionKind
  score: number
}

export type HumanTaskContentCandidate = {
  candidateId: string
  grade: GradeKey
  blockId: string
  block: {
    udaCode: string
    packCode: string
    period: string
    focus: string
    durationMinutes: number
    planSourceCode: string
  }
  sources: {
    uda: HumanTaskPipelineSource | null
    pack: HumanTaskPipelineSource | null
  }
  evidence: {
    uda: ExtractedUda | null
    pack: ExtractedPack | null
    udaHourWindow: ExtractedUdaHour[] | null
    rankedPackMatches: HumanTaskPackMatch[]
  }
  gate: {
    status: 'BLOCKED' | 'READY_FOR_HUMAN_REVIEW'
    promotion: 'HUMAN_REVIEW_REQUIRED'
    issues: HumanTaskPipelineIssue[]
  }
}

export class HumanTaskContentPipelineService {
  constructor(private readonly sources: HumanTaskContentSourcePort) {}

  async compile(workspaceId: string, grade: GradeKey, blockId: string): Promise<HumanTaskContentCandidate> {
    const block = findBlock(grade, blockId)
    if (!block) return blockedMissingBlock(grade, blockId)

    const udaSourceCode = `CAN-UDA-${block.uda}`
    const [uda, pack] = await Promise.all([
      this.sources.getCurrentByCanonicalCode(workspaceId, udaSourceCode),
      this.sources.getCurrentByCanonicalCode(workspaceId, block.pack),
    ])

    return compileHumanTaskContentCandidate(grade, blockId, { uda, pack })
  }
}

export function compileHumanTaskContentCandidate(
  grade: GradeKey,
  blockId: string,
  sourceInput: { uda: HumanTaskPipelineSource | null; pack: HumanTaskPipelineSource | null },
): HumanTaskContentCandidate {
  const block = findBlock(grade, blockId)
  if (!block) return blockedMissingBlock(grade, blockId)

  const expectedUdaCode = `CAN-UDA-${block.uda}`
  const issues: HumanTaskPipelineIssue[] = []

  if (!sourceInput.uda) {
    issues.push(issue('UDA_SOURCE_MISSING', 'BLOCKING', `Sorgente ${expectedUdaCode} non disponibile nella KB corrente.`))
  } else if (sourceInput.uda.code !== expectedUdaCode) {
    issues.push(issue('UDA_SOURCE_CODE_MISMATCH', 'BLOCKING', `Attesa ${expectedUdaCode}, ricevuta ${sourceInput.uda.code}.`))
  }

  if (!sourceInput.pack) {
    issues.push(issue('PACK_SOURCE_MISSING', 'BLOCKING', `Sorgente ${block.pack} non disponibile nella KB corrente.`))
  } else if (sourceInput.pack.code !== block.pack) {
    issues.push(issue('PACK_SOURCE_CODE_MISMATCH', 'BLOCKING', `Atteso ${block.pack}, ricevuto ${sourceInput.pack.code}.`))
  }

  const uda = sourceInput.uda && sourceInput.uda.code === expectedUdaCode
    ? extractCanonicalUda(sourceInput.uda.code, sourceInput.uda.normalizedText)
    : null
  const pack = sourceInput.pack && sourceInput.pack.code === block.pack
    ? extractCanonicalPack(sourceInput.pack.code, sourceInput.pack.normalizedText)
    : null

  if (uda && !uda.hours.length) issues.push(issue('UDA_PARSE_EMPTY', 'BLOCKING', 'La UDA non contiene una articolazione oraria estraibile.'))
  if (pack && !pack.sections.length) issues.push(issue('PACK_PARSE_EMPTY', 'BLOCKING', 'Il pacchetto non contiene sezioni operative estraibili.'))

  const udaHourWindow = uda ? resolveUdaHourWindow(grade, blockId, uda) : null
  if (uda && uda.hours.length && !udaHourWindow) {
    issues.push(issue(
      'UDA_HOUR_WINDOW_AMBIGUOUS',
      'REVIEW',
      'La granularità della UDA non consente di assegnare automaticamente un intervallo di ore a questo blocco. Serve un raccordo umano esplicito.',
    ))
  }

  const rankedPackMatches = pack
    ? rankPackSections(pack.sections, [
        block.focus,
        ...(udaHourWindow ?? []).flatMap((hour) => [hour.title, hour.content]),
      ].join(' ')).slice(0, 5)
    : []

  const blocking = issues.some((item) => item.severity === 'BLOCKING')
  return {
    candidateId: `HTC-CANDIDATE:${grade}:${block.id}:${sourceInput.uda?.generationId ?? 'no-uda'}:${sourceInput.pack?.generationId ?? 'no-pack'}`,
    grade,
    blockId: block.id,
    block: {
      udaCode: block.uda,
      packCode: block.pack,
      period: block.period,
      focus: block.focus,
      durationMinutes: block.hours * 60,
      planSourceCode: CANONICAL_PLAN_SOURCES[grade].code,
    },
    sources: sourceInput,
    evidence: { uda, pack, udaHourWindow, rankedPackMatches },
    gate: {
      status: blocking ? 'BLOCKED' : 'READY_FOR_HUMAN_REVIEW',
      promotion: 'HUMAN_REVIEW_REQUIRED',
      issues,
    },
  }
}

export function extractCanonicalUda(code: string, normalizedText: string): ExtractedUda {
  const text = normalizeText(normalizedText)
  const titleMatch = text.match(/^CAN-UDA-[^\n]*?—\s*(.+)$/m)
  const durationMatch = text.match(/Durata prevista:\s*(\d+)\s*ore?/i)
  const hours: ExtractedUdaHour[] = []
  const hourPattern = /(?:^|\n)Ora\s+(\d+)\s+—\s+([^\n]+)\n+([\s\S]*?)(?=\n+Ora\s+\d+\s+—|\n+\d+\.\s+[A-ZÀ-Ý][^\n]*|$)/g

  for (const match of text.matchAll(hourPattern)) {
    hours.push({
      ordinal: Number(match[1]),
      title: cleanLine(match[2]),
      content: cleanParagraph(match[3]),
    })
  }

  return {
    code,
    title: titleMatch ? cleanLine(titleMatch[1]) : null,
    durationHours: durationMatch ? Number(durationMatch[1]) : null,
    hours,
  }
}

export function extractCanonicalPack(code: string, normalizedText: string): ExtractedPack {
  const text = normalizeText(normalizedText)
  const titleMatch = text.match(/^CAN-PACK-[^\n]*?—\s*(.+)$/m)
  const chunks = text
    .split(/\n\s*= {0,2}={8,}\s*\n|\n\s*={10,}\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  const sections = chunks.flatMap((chunk, ordinal) => {
    const lines = chunk.split('\n').map(cleanLine).filter(Boolean)
    if (!lines.length) return []
    const heading = lines[0]
    const kind = classifyPackHeading(heading)
    if (kind === 'OTHER' && ordinal === 0) return []
    const durationMatch = chunk.match(/Durata:\s*(\d+)\s*ore?/i)
    const objectiveMatch = chunk.match(/Obiettivo:\s*([^\n]+)/i)
    const listItems = lines
      .filter((line) => /^[-•]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
      .map((line) => line.replace(/^[-•]\s+|^\d+[.)]\s+/, '').trim())
      .filter(Boolean)

    return [{
      ordinal,
      heading,
      kind,
      content: cleanParagraph(lines.slice(1).join('\n')),
      durationMinutes: durationMatch ? Number(durationMatch[1]) * 60 : null,
      objective: objectiveMatch ? cleanLine(objectiveMatch[1]) : null,
      listItems,
    } satisfies ExtractedPackSection]
  })

  return {
    code,
    title: titleMatch ? cleanLine(titleMatch[1]) : null,
    sections,
  }
}

export function canonicalCodeFromOriginalName(originalName: string | null): string | null {
  if (!originalName) return null
  const match = originalName.toUpperCase().match(/^(CAN-(?:PLAN|UDA|PACK)-[A-Z0-9-]+)/)
  return match?.[1] ?? null
}

function resolveUdaHourWindow(grade: GradeKey, blockId: string, uda: ExtractedUda): ExtractedUdaHour[] | null {
  const blocks = buildBlocks(grade)
  const index = blocks.findIndex((block) => block.id === blockId.toUpperCase())
  if (index < 0) return null
  const current = blocks[index]

  let start = index
  while (start > 0 && sameSegment(blocks[start - 1], current)) start -= 1
  let end = index
  while (end + 1 < blocks.length && sameSegment(blocks[end + 1], current)) end += 1

  const runLength = end - start + 1
  const runHours = runLength * current.hours
  if (uda.durationHours !== runHours) return null
  if (uda.hours.length !== uda.durationHours) return null

  const offset = (index - start) * current.hours
  return uda.hours.slice(offset, offset + current.hours)
}

function rankPackSections(sections: ExtractedPackSection[], context: string): HumanTaskPackMatch[] {
  const contextTokens = tokens(context)
  return sections
    .map((section) => {
      const sectionTokens = tokens(`${section.heading} ${section.objective ?? ''} ${section.content}`)
      let overlap = 0
      for (const token of contextTokens) if (sectionTokens.has(token)) overlap += 1
      const kindBoost = section.kind === 'TEACHER_GUIDE' ? 3 : section.kind === 'STUDENT_SHEET' ? 1 : 0
      return { sectionOrdinal: section.ordinal, heading: section.heading, kind: section.kind, score: overlap + kindBoost }
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.sectionOrdinal - b.sectionOrdinal)
}

function classifyPackHeading(heading: string): PackSectionKind {
  const normalized = heading.toUpperCase()
  if (normalized.startsWith('SCHEDA DOCENTE')) return 'TEACHER_GUIDE'
  if (normalized.startsWith('SCHEDA ALUNNO')) return 'STUDENT_SHEET'
  if (normalized.includes('GRIGLIA') && normalized.includes('OSSERVAZIONE')) return 'OBSERVATION_TOOL'
  if (normalized.startsWith('COMPITO SIGNIFICATIVO')) return 'TASK_BRIEF'
  if (normalized.startsWith('RUBRICA')) return 'RUBRIC'
  if (normalized.startsWith('CHECKLIST DOCENTE')) return 'CHECKLIST'
  if (normalized.startsWith('ADATTAMENTI')) return 'ADAPTATION_GUIDANCE'
  return 'OTHER'
}

function tokens(value: string) {
  const stop = new Set(['della', 'delle', 'degli', 'dello', 'alla', 'alle', 'agli', 'allo', 'nella', 'nelle', 'con', 'che', 'per', 'una', 'uno', 'gli', 'dei', 'del', 'dal', 'dai', 'tra', 'fra', 'come', 'sono', 'essere', 'questa', 'questo'])
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !stop.has(token))
  return new Set(normalized)
}

function findBlock(grade: GradeKey, blockId: string) {
  return buildBlocks(grade).find((block) => block.id === blockId.toUpperCase()) ?? null
}

function blockedMissingBlock(grade: GradeKey, blockId: string): HumanTaskContentCandidate {
  return {
    candidateId: `HTC-CANDIDATE:${grade}:${blockId.toUpperCase()}:missing`,
    grade,
    blockId: blockId.toUpperCase(),
    block: {
      udaCode: '',
      packCode: '',
      period: '',
      focus: '',
      durationMinutes: 0,
      planSourceCode: CANONICAL_PLAN_SOURCES[grade].code,
    },
    sources: { uda: null, pack: null },
    evidence: { uda: null, pack: null, udaHourWindow: null, rankedPackMatches: [] },
    gate: {
      status: 'BLOCKED',
      promotion: 'HUMAN_REVIEW_REQUIRED',
      issues: [issue('BLOCK_NOT_FOUND', 'BLOCKING', `Blocco ${blockId.toUpperCase()} non presente nel Piano annuale ${grade}.`)],
    },
  }
}

function sameSegment(a: ReturnType<typeof buildBlocks>[number], b: ReturnType<typeof buildBlocks>[number]) {
  return a.uda === b.uda && a.pack === b.pack && a.period === b.period && a.focus === b.focus
}

function issue(code: HumanTaskPipelineIssueCode, severity: HumanTaskPipelineIssue['severity'], message: string): HumanTaskPipelineIssue {
  return { code, severity, message }
}

function normalizeText(value: string) {
  return value.replace(/\r\n?/g, '\n').replace(/[\t ]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanParagraph(value: string) {
  return value.split('\n').map(cleanLine).filter(Boolean).join('\n')
}
