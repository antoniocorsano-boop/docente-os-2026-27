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

export type ExtractedUdaPhase = {
  ordinal: number
  title: string
  durationMinutes: number
  content: string
}

export type ExtractedUdaSection = {
  ordinal: number
  heading: string
  content: string
  listItems: string[]
}

export type ExtractedUda = {
  code: string
  title: string | null
  durationHours: number | null
  hours: ExtractedUdaHour[]
  phases: ExtractedUdaPhase[]
  sections: ExtractedUdaSection[]
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
  activity: string | null
  product: string | null
  evidence: string | null
  materials: string[]
  methodNote: string | null
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
  | 'SUPPORT_PACK_SOURCE_MISSING'
  | 'UDA_SOURCE_CODE_MISMATCH'
  | 'PACK_SOURCE_CODE_MISMATCH'
  | 'SUPPORT_PACK_SOURCE_CODE_MISMATCH'
  | 'UDA_PARSE_EMPTY'
  | 'PACK_PARSE_EMPTY'
  | 'UDA_HOUR_WINDOW_AMBIGUOUS'

export type HumanTaskPipelineIssue = {
  code: HumanTaskPipelineIssueCode
  severity: 'BLOCKING' | 'REVIEW'
  message: string
}

export type HumanTaskPackMatch = {
  sourceCode: string
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
    supportPackCodes: string[]
    period: string
    focus: string
    title: string
    durationMinutes: number
    planSourceCode: string
    segmentKey: string
  }
  sources: {
    uda: HumanTaskPipelineSource | null
    pack: HumanTaskPipelineSource | null
    supportPacks: HumanTaskPipelineSource[]
  }
  evidence: {
    uda: ExtractedUda | null
    pack: ExtractedPack | null
    supportPacks: ExtractedPack[]
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
    const [uda, pack, ...supportPacks] = await Promise.all([
      this.sources.getCurrentByCanonicalCode(workspaceId, udaSourceCode),
      this.sources.getCurrentByCanonicalCode(workspaceId, block.pack),
      ...block.supportPacks.map((code) => this.sources.getCurrentByCanonicalCode(workspaceId, code)),
    ])

    return compileHumanTaskContentCandidate(grade, blockId, {
      uda,
      pack,
      supportPacks: supportPacks.filter((source): source is HumanTaskPipelineSource => source !== null),
    })
  }
}

export function compileHumanTaskContentCandidate(
  grade: GradeKey,
  blockId: string,
  sourceInput: {
    uda: HumanTaskPipelineSource | null
    pack: HumanTaskPipelineSource | null
    supportPacks?: HumanTaskPipelineSource[]
  },
): HumanTaskContentCandidate {
  const block = findBlock(grade, blockId)
  if (!block) return blockedMissingBlock(grade, blockId)

  const expectedUdaCode = `CAN-UDA-${block.uda}`
  const supportPacks = sourceInput.supportPacks ?? []
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

  const supportByCode = new Map(supportPacks.map((source) => [source.code, source]))
  for (const code of block.supportPacks) {
    const source = supportByCode.get(code)
    if (!source) {
      issues.push(issue('SUPPORT_PACK_SOURCE_MISSING', 'BLOCKING', `Sorgente di supporto ${code} non disponibile nella KB corrente.`))
    } else if (source.code !== code) {
      issues.push(issue('SUPPORT_PACK_SOURCE_CODE_MISMATCH', 'BLOCKING', `Atteso pacchetto di supporto ${code}, ricevuto ${source.code}.`))
    }
  }

  const uda = sourceInput.uda && sourceInput.uda.code === expectedUdaCode
    ? extractCanonicalUda(sourceInput.uda.code, sourceInput.uda.normalizedText)
    : null
  const pack = sourceInput.pack && sourceInput.pack.code === block.pack
    ? extractCanonicalPack(sourceInput.pack.code, sourceInput.pack.normalizedText)
    : null
  const extractedSupportPacks = block.supportPacks.flatMap((code) => {
    const source = supportByCode.get(code)
    return source ? [extractCanonicalPack(code, source.normalizedText)] : []
  })

  if (uda && !uda.hours.length && !uda.phases.length) {
    issues.push(issue('UDA_PARSE_EMPTY', 'BLOCKING', 'La UDA non contiene una articolazione per ore o fasi estraibile.'))
  }
  if (pack && !pack.sections.length) issues.push(issue('PACK_PARSE_EMPTY', 'BLOCKING', 'Il pacchetto non contiene sezioni operative estraibili.'))
  for (const supportPack of extractedSupportPacks) {
    if (!supportPack.sections.length) issues.push(issue('PACK_PARSE_EMPTY', 'BLOCKING', `Il pacchetto ${supportPack.code} non contiene sezioni operative estraibili.`))
  }

  const udaHourWindow = uda ? resolveUdaHourWindow(grade, blockId, uda) : null
  if (uda && (uda.hours.length || uda.phases.length) && !udaHourWindow) {
    issues.push(issue(
      'UDA_HOUR_WINDOW_AMBIGUOUS',
      'REVIEW',
      'La granularità della UDA non consente di assegnare automaticamente un intervallo orario a questo blocco. Il Projection Recipe deve dichiarare il raccordo usato.',
    ))
  }

  const packs = [pack, ...extractedSupportPacks].filter((item): item is ExtractedPack => item !== null)
  const context = [
    block.title,
    block.focus,
    ...(udaHourWindow ?? []).flatMap((hour) => [hour.title, hour.content]),
    ...(uda?.phases ?? []).flatMap((phase) => [phase.title, phase.content]),
  ].join(' ')
  const rankedPackMatches = packs
    .flatMap((candidatePack) => rankPackSections(candidatePack, context))
    .sort((a, b) => b.score - a.score || a.sourceCode.localeCompare(b.sourceCode) || a.sectionOrdinal - b.sectionOrdinal)
    .slice(0, 8)

  const blocking = issues.some((item) => item.severity === 'BLOCKING')
  const generationFingerprint = [
    sourceInput.uda?.generationId ?? 'no-uda',
    sourceInput.pack?.generationId ?? 'no-pack',
    ...block.supportPacks.map((code) => supportByCode.get(code)?.generationId ?? `no-${code}`),
  ].join(':')

  return {
    candidateId: `HTC-CANDIDATE:${grade}:${block.id}:${generationFingerprint}`,
    grade,
    blockId: block.id,
    block: {
      udaCode: block.uda,
      packCode: block.pack,
      supportPackCodes: [...block.supportPacks],
      period: block.period,
      focus: block.focus,
      title: block.title,
      durationMinutes: block.hours * 60,
      planSourceCode: CANONICAL_PLAN_SOURCES[grade].code,
      segmentKey: block.segmentKey,
    },
    sources: { uda: sourceInput.uda, pack: sourceInput.pack, supportPacks },
    evidence: { uda, pack, supportPacks: extractedSupportPacks, udaHourWindow, rankedPackMatches },
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
  const lines = text.split('\n')
  const hours: ExtractedUdaHour[] = []
  const phases: ExtractedUdaPhase[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const hourMatch = cleanLine(lines[index]).match(/^Ora\s+(\d+)\s+—\s+(.+)$/i)
    if (!hourMatch) continue
    const content = collectUntil(lines, index + 1, (line) => /^Ora\s+\d+\s+—/i.test(line) || /^\d+\.\s+[A-ZÀ-Ý]/.test(line))
    hours.push({ ordinal: Number(hourMatch[1]), title: cleanLine(hourMatch[2]), content: cleanParagraph(content.join('\n')) })
  }

  for (let index = 0; index < lines.length; index += 1) {
    const phaseMatch = cleanLine(lines[index]).match(/^Fase\s+(\d+)\s+—\s+(.+?)\s+—\s+(\d+)\s*(ora|ore)\.?$/i)
    if (!phaseMatch) continue
    const content = collectUntil(lines, index + 1, (line) => /^Fase\s+\d+\s+—/i.test(line) || /^\d+\.\s+[A-ZÀ-Ý]/.test(line))
    phases.push({
      ordinal: Number(phaseMatch[1]),
      title: cleanLine(phaseMatch[2]),
      durationMinutes: Number(phaseMatch[3]) * 60,
      content: cleanParagraph(content.join('\n')),
    })
  }

  return {
    code,
    title: titleMatch ? cleanLine(titleMatch[1]) : null,
    durationHours: durationMatch ? Number(durationMatch[1]) : null,
    hours,
    phases,
    sections: extractNumberedSections(lines),
  }
}

export function extractCanonicalPack(code: string, normalizedText: string): ExtractedPack {
  const text = normalizeText(normalizedText)
  const titleMatch = text.match(/^CAN-PACK-[^\n]*?—\s*(.+)$/m)
  const lines = text.split('\n')
  const chunks = extractPackChunks(lines)

  const sections = chunks.map((chunk, ordinal) => {
    const heading = cleanLine(chunk.heading)
    const kind = classifyPackHeading(heading)
    const body = cleanParagraph(chunk.body.join('\n'))
    const durationMatch = `${heading}\n${body}`.match(/(?:Durata:\s*|\()?(\d+)\s*h(?:\)|\b)|Durata:\s*(\d+)\s*ore?/i)
    const objective = extractLabeledField(chunk.body, 'Obiettivo')
    const activity = extractLabeledField(chunk.body, 'Attività') ?? extractLabeledField(chunk.body, 'Sequenza')
    const product = extractLabeledField(chunk.body, 'Prodotto') ?? extractLabeledField(chunk.body, 'Prodotto finale')
    const evidence = extractLabeledField(chunk.body, 'Evidenza')
    const materialsField = extractLabeledField(chunk.body, 'Materiali') ?? extractLabeledField(chunk.body, 'Materiali da predisporre')
    const methodNote = extractLabeledField(chunk.body, 'Regola metodologica')
    const listItems = chunk.body
      .map(cleanLine)
      .filter((line) => /^[-•]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
      .map((line) => line.replace(/^[-•]\s+|^\d+[.)]\s+/, '').trim())
      .filter(Boolean)

    return {
      ordinal,
      heading,
      kind,
      content: body,
      durationMinutes: durationMatch ? Number(durationMatch[1] ?? durationMatch[2]) * 60 : null,
      objective,
      activity,
      product,
      evidence,
      materials: splitMaterialItems(materialsField),
      methodNote,
      listItems,
    } satisfies ExtractedPackSection
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
  if (!uda.hours.length) return null
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

function rankPackSections(pack: ExtractedPack, context: string): HumanTaskPackMatch[] {
  const contextTokens = tokens(context)
  return pack.sections
    .map((section) => {
      const sectionTokens = tokens(`${section.heading} ${section.objective ?? ''} ${section.activity ?? ''} ${section.content}`)
      let overlap = 0
      for (const token of contextTokens) if (sectionTokens.has(token)) overlap += 1
      const kindBoost = section.kind === 'TEACHER_GUIDE' ? 3 : section.kind === 'STUDENT_SHEET' ? 1 : 0
      return { sourceCode: pack.code, sectionOrdinal: section.ordinal, heading: section.heading, kind: section.kind, score: overlap + kindBoost }
    })
    .filter((match) => match.score > 0)
}

function classifyPackHeading(heading: string): PackSectionKind {
  const normalized = stripNumberedHeadingPrefix(heading).toUpperCase()
  if (normalized.startsWith('SCHEDA DOCENTE') || normalized.startsWith('LEZIONE ')) return 'TEACHER_GUIDE'
  if (normalized.startsWith('SCHEDA ALUNNO') || /^SCHEDA\s+[A-Z]\b/.test(normalized) || /^TAVOLA\s+[A-Z]\b/.test(normalized)) return 'STUDENT_SHEET'
  if (normalized.startsWith('EXIT TICKET') || (normalized.includes('GRIGLIA') && normalized.includes('OSSERVAZIONE'))) return 'OBSERVATION_TOOL'
  if (normalized.startsWith('COMPITO SIGNIFICATIVO') || normalized.startsWith('MINI-COMPITO SIGNIFICATIVO')) return 'TASK_BRIEF'
  if (normalized.startsWith('RUBRICA')) return 'RUBRIC'
  if (normalized.startsWith('CHECKLIST DOCENTE') || normalized.startsWith('MATERIALI DA PREDISPORRE')) return 'CHECKLIST'
  if (normalized.startsWith('ADATTAMENTI') || normalized.startsWith('INCLUSIONE')) return 'ADAPTATION_GUIDANCE'
  return 'OTHER'
}

function extractNumberedSections(lines: string[]): ExtractedUdaSection[] {
  const starts: Array<{ lineIndex: number; ordinal: number; heading: string }> = []
  lines.forEach((rawLine, lineIndex) => {
    const match = cleanLine(rawLine).match(/^(\d+)\.\s+(.+)$/)
    if (match && isLikelyDocumentHeading(match[2])) starts.push({ lineIndex, ordinal: Number(match[1]), heading: cleanLine(match[2]) })
  })

  return starts.map((start, index) => {
    const end = starts[index + 1]?.lineIndex ?? lines.length
    const bodyLines = lines.slice(start.lineIndex + 1, end)
    return {
      ordinal: start.ordinal,
      heading: start.heading,
      content: cleanParagraph(bodyLines.join('\n')),
      listItems: bodyLines
        .map(cleanLine)
        .filter((line) => /^[-•]\s+/.test(line))
        .map((line) => line.replace(/^[-•]\s+/, '').trim())
        .filter(Boolean),
    }
  })
}

function extractPackChunks(lines: string[]): Array<{ heading: string; body: string[] }> {
  const starts: Array<{ lineIndex: number; heading: string }> = []
  lines.forEach((rawLine, lineIndex) => {
    const line = cleanLine(rawLine)
    if (isPackSectionHeading(line)) starts.push({ lineIndex, heading: line })
  })

  return starts.map((start, index) => ({
    heading: start.heading,
    body: lines.slice(start.lineIndex + 1, starts[index + 1]?.lineIndex ?? lines.length),
  }))
}

function isPackSectionHeading(line: string) {
  const normalized = stripNumberedHeadingPrefix(line).toUpperCase()
  if (/^SCHEDA DOCENTE\b/.test(normalized)) return true
  if (/^SCHEDA ALUNNO\b/.test(normalized)) return true
  if (/^SCHEDA\s+[A-Z]\b/.test(normalized)) return true
  if (/^TAVOLA\s+[A-Z]\b/.test(normalized)) return true
  if (/^EXIT TICKET\b/.test(normalized)) return true
  if (/^(?:MINI-)?COMPITO SIGNIFICATIVO\b/.test(normalized)) return true
  if (/^RUBRICA\b/.test(normalized)) return true
  if (/^CHECKLIST DOCENTE\b/.test(normalized)) return true
  if (/^ADATTAMENTI\b/.test(normalized)) return true
  if (/^\d+\.\s+/.test(line) && isLikelyDocumentHeading(line.replace(/^\d+\.\s+/, ''))) return true
  return false
}

function isLikelyDocumentHeading(value: string) {
  const letters = value.match(/[A-Za-zÀ-Ýà-ÿ]/g)?.join('') ?? ''
  if (letters.length < 3) return false
  return letters === letters.toUpperCase()
}

function stripNumberedHeadingPrefix(value: string) {
  return value.replace(/^\d+\.\s+/, '').trim()
}

const PACK_FIELD_LABELS = [
  'UDA prevalente',
  'Durata',
  'Obiettivo',
  'Materiali da predisporre',
  'Materiali',
  'Attività',
  'Sequenza',
  'Prodotto finale',
  'Prodotto',
  'Evidenza',
  'Regola metodologica',
  'Open Day',
  'Consegna',
  'Criterio Open Day',
]

function extractLabeledField(lines: string[], label: string): string | null {
  const normalizedLabel = label.toLocaleLowerCase('it')
  const start = lines.findIndex((rawLine) => {
    const line = cleanLine(rawLine)
    const separator = line.indexOf(':')
    if (separator < 0) return false
    return line.slice(0, separator).trim().toLocaleLowerCase('it') === normalizedLabel
  })
  if (start < 0) return null

  const firstLine = cleanLine(lines[start])
  const firstValue = firstLine.slice(firstLine.indexOf(':') + 1).trim()
  const following: string[] = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = cleanLine(lines[index])
    if (!line) continue
    const separator = line.indexOf(':')
    const possibleLabel = separator >= 0 ? line.slice(0, separator).trim().toLocaleLowerCase('it') : ''
    if (PACK_FIELD_LABELS.some((candidate) => candidate.toLocaleLowerCase('it') === possibleLabel)) break
    following.push(line)
  }

  const value = [firstValue, ...following].filter(Boolean).join('\n')
  return value ? cleanParagraph(value) : null
}

function splitMaterialItems(value: string | null): string[] {
  if (!value) return []
  const lines = value.split('\n').map(cleanLine).filter(Boolean)
  const bulletItems = lines
    .filter((line) => /^[-•]\s+/.test(line))
    .map((line) => line.replace(/^[-•]\s+/, '').trim())
    .filter(Boolean)
  if (bulletItems.length) return bulletItems
  return value
    .split(/[;,]/)
    .map(cleanLine)
    .filter((item) => item.length > 1)
}

function collectUntil(lines: string[], start: number, stop: (line: string) => boolean) {
  const result: string[] = []
  for (let index = start; index < lines.length; index += 1) {
    const line = cleanLine(lines[index])
    if (stop(line)) break
    result.push(lines[index])
  }
  return result
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
      supportPackCodes: [],
      period: '',
      focus: '',
      title: '',
      durationMinutes: 0,
      planSourceCode: CANONICAL_PLAN_SOURCES[grade].code,
      segmentKey: '',
    },
    sources: { uda: null, pack: null, supportPacks: [] },
    evidence: { uda: null, pack: null, supportPacks: [], udaHourWindow: null, rankedPackMatches: [] },
    gate: {
      status: 'BLOCKED',
      promotion: 'HUMAN_REVIEW_REQUIRED',
      issues: [issue('BLOCK_NOT_FOUND', 'BLOCKING', `Blocco ${blockId.toUpperCase()} non presente nel Piano annuale ${grade}.`)],
    },
  }
}

function sameSegment(a: ReturnType<typeof buildBlocks>[number], b: ReturnType<typeof buildBlocks>[number]) {
  return a.segmentKey === b.segmentKey
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
