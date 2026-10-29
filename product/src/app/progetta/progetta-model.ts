import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import type { TextbookCurricoloAlignmentV1 } from '@/core/domain/cml-textbook-applicability'
import type { TextbookAdoptionWithBook } from '@/core/domain/textbook-adoption'
import { canonicalPlanSupportsDisciplineName } from '@/core/presentation/canonical-plan-discipline'
import { buildBlocks, type GradeKey } from '../piano-annuale/model'

export type ProgettaItem = { asset: KnowledgeAsset; document: KnowledgeDocument | null }
export type ProgettaGrade = 'prima' | 'seconda' | 'terza'

export type ProgettaFocus = {
  blockId: string | null
  uda: string | null
  pack: string | null
}

export type ResolvedProgettaFocus = {
  blockId: string
  uda: string
  pack: string
  period: string
  title: string
}

export type ProgettaGroup = {
  key: 'programming' | 'uda' | 'materials'
  title: string
  description: string
  items: ProgettaItem[]
}

export type PlanningCoverage = {
  grade: ProgettaGrade
  programming: number
  uda: number
  materials: number
}

export type ProgettaTextbookReference = {
  alignmentId: string
  requirementId: string
  relation: TextbookCurricoloAlignmentV1['relation']
  coverage: TextbookCurricoloAlignmentV1['coverage']
  evidenceLevel: TextbookCurricoloAlignmentV1['evidenceLevel']
  sectionLabel: string | null
  chapterLabel: string | null
  pageRangeLabel: string | null
  resourceRef: string | null
}

export type ProgettaTextbookSupport = {
  adoptionId: string
  textbookId: string
  teachingAssignmentId: string
  title: string
  subtitle: string | null
  authors: string | null
  publisher: string
  editionLabel: string | null
  volumeLabel: string | null
  isbn13: string
  udaCode: string
  alignmentState: 'VERIFIED' | 'ADOPTED_ONLY'
  references: ProgettaTextbookReference[]
}

const GRADE_KEY: Record<ProgettaGrade, GradeKey> = {
  prima: 'Prima',
  seconda: 'Seconda',
  terza: 'Terza',
}

export function filterProgettaItemsByGrade(items: ProgettaItem[], grade: ProgettaGrade | null) {
  if (!grade) return items
  return items.filter(({ asset }) => {
    const itemGrade = asset.sourceMetadata.grade
    return itemGrade === grade || itemGrade == null || itemGrade === ''
  })
}

export function filterProgettaItemsBySectionContext(items: ProgettaItem[], compactSectionLabel: string | null) {
  if (!compactSectionLabel) return items
  const target = normalizeClassLabel(compactSectionLabel)
  return items.filter(({ asset }) => {
    const sectionLabels = (asset.classLabels ?? [])
      .map(normalizeClassLabel)
      .filter(isSectionSpecificClassLabel)
    return !sectionLabels.length || sectionLabels.includes(target)
  })
}

export function asProgettaGrade(value: string | undefined): ProgettaGrade | null {
  return value === 'prima' || value === 'seconda' || value === 'terza' ? value : null
}

export function asProgettaFocus(input: { block?: string; uda?: string; pack?: string }): ProgettaFocus | null {
  const blockId = input.block && /^B\d{2}$/i.test(input.block) ? input.block.toUpperCase() : null
  const uda = input.uda && /^\d-\d{2}$/i.test(input.uda) ? input.uda.toLowerCase() : null
  const pack = input.pack && /^CAN-PACK-\d[A-Z]$/i.test(input.pack) ? input.pack.toUpperCase() : null
  return blockId || uda || pack ? { blockId, uda, pack } : null
}

export function resolveCanonicalProgettaFocus(grade: ProgettaGrade | null, focus: ProgettaFocus | null): ResolvedProgettaFocus | null {
  if (!grade || !focus?.blockId) return null
  const block = buildBlocks(GRADE_KEY[grade]).find((candidate) => candidate.id === focus.blockId)
  if (!block) return null
  if (focus.uda && focus.uda !== block.uda) return null
  if (focus.pack && focus.pack !== block.pack) return null
  return {
    blockId: block.id,
    uda: block.uda,
    pack: block.pack,
    period: block.period,
    title: block.focus,
  }
}

export function filterProgettaItemsByFocus(items: ProgettaItem[], focus: ProgettaFocus | ResolvedProgettaFocus | null) {
  if (!focus) return []
  const needles = [focus.pack, focus.uda, focus.blockId].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase())
  if (!needles.length) return []
  return items.filter((item) => {
    const searchable = searchableText(item)
    return needles.some((needle) => searchable.includes(needle))
  })
}

export function partitionProgettaFocusBySection(items: ProgettaItem[], compactSectionLabel: string | null) {
  if (!compactSectionLabel) return { core: items, section: [] as ProgettaItem[] }
  const target = normalizeClassLabel(compactSectionLabel)
  const section: ProgettaItem[] = []
  const core: ProgettaItem[] = []
  for (const item of items) {
    const labels = item.asset.classLabels ?? []
    if (labels.some((label) => normalizeClassLabel(label) === target)) section.push(item)
    else core.push(item)
  }
  return { core, section }
}

export function groupProgettaItems(items: ProgettaItem[]): ProgettaGroup[] {
  return [
    {
      key: 'programming',
      title: 'Programmazione annuale',
      description: 'Quadro comune, obiettivi, scansione e monte ore.',
      items: items.filter(({ asset }) => asset.contentCategory === 'PROGRAMMING'),
    },
    {
      key: 'uda',
      title: 'Unità di apprendimento',
      description: 'Percorsi, prodotti autentici, evidenze e valutazione.',
      items: items.filter(({ asset }) => asset.contentCategory === 'UDA'),
    },
    {
      key: 'materials',
      title: 'Materiali operativi',
      description: 'Risorse didattiche, modelli, verifiche e rubriche.',
      items: items.filter(({ asset }) => ['TEACHING_RESOURCE', 'MODEL', 'ASSESSMENT'].includes(asset.contentCategory)),
    },
  ]
}

export function planningCoverage(items: ProgettaItem[]): PlanningCoverage[] {
  return (['prima', 'seconda', 'terza'] as const).map((grade) => ({
    grade,
    programming: items.filter(({ asset }) => asset.contentCategory === 'PROGRAMMING' && asset.sourceMetadata.grade === grade).length,
    uda: items.filter(({ asset }) => asset.contentCategory === 'UDA' && asset.sourceMetadata.grade === grade).length,
    materials: items.filter(({ asset }) =>
      ['TEACHING_RESOURCE', 'MODEL', 'ASSESSMENT'].includes(asset.contentCategory)
      && asset.sourceMetadata.grade === grade,
    ).length,
  }))
}

export function buildProgettaTextbookSupport(input: {
  sectionId: string | null
  focus: ResolvedProgettaFocus | null
  assignments: readonly { id: string; sectionId: string; disciplineName?: string | null }[]
  adoptions: readonly TextbookAdoptionWithBook[]
  validatedAlignments: readonly TextbookCurricoloAlignmentV1[]
}): ProgettaTextbookSupport[] {
  if (!input.sectionId || !input.focus) return []

  const assignmentIds = new Set(
    input.assignments
      .filter((assignment) =>
        assignment.sectionId === input.sectionId
        && canonicalPlanSupportsDisciplineName(assignment.disciplineName),
      )
      .map((assignment) => assignment.id),
  )
  if (!assignmentIds.size) return []

  const udaCode = `CAN-UDA-${input.focus.uda}`

  return input.adoptions
    .filter((adoption) =>
      adoption.status === 'CONFIRMED'
      && adoption.usageKind === 'ADOPTED'
      && assignmentIds.has(adoption.teachingAssignmentId),
    )
    .map((adoption) => {
      const references = input.validatedAlignments
        .filter((alignment) =>
          alignment.textbookAdoptionId === adoption.id
          && alignment.textbookId === adoption.textbookId
          && alignment.teachingAssignmentId === adoption.teachingAssignmentId
          && alignment.udaCode === udaCode,
        )
        .map(toProgettaTextbookReference)
        .sort(compareTextbookReferences)

      return {
        adoptionId: adoption.id,
        textbookId: adoption.textbookId,
        teachingAssignmentId: adoption.teachingAssignmentId,
        title: adoption.textbook.title,
        subtitle: adoption.textbook.subtitle,
        authors: adoption.textbook.authors,
        publisher: adoption.textbook.publisher,
        editionLabel: adoption.textbook.editionLabel,
        volumeLabel: adoption.textbook.volumeLabel,
        isbn13: adoption.textbook.isbn13,
        udaCode,
        alignmentState: references.length ? 'VERIFIED' as const : 'ADOPTED_ONLY' as const,
        references,
      }
    })
    .sort((left, right) => left.title.localeCompare(right.title, 'it') || left.isbn13.localeCompare(right.isbn13))
}

function toProgettaTextbookReference(alignment: TextbookCurricoloAlignmentV1): ProgettaTextbookReference {
  return {
    alignmentId: alignment.alignmentId,
    requirementId: alignment.requirementId,
    relation: alignment.relation,
    coverage: alignment.coverage,
    evidenceLevel: alignment.evidenceLevel,
    sectionLabel: alignment.sectionLabel ?? null,
    chapterLabel: alignment.chapterLabel ?? null,
    pageRangeLabel: alignment.evidenceLevel === 'VERIFIED_PAGE' && alignment.pageRange
      ? `pp. ${alignment.pageRange.from}–${alignment.pageRange.to}`
      : null,
    resourceRef: alignment.resourceRef ?? null,
  }
}

function compareTextbookReferences(left: ProgettaTextbookReference, right: ProgettaTextbookReference) {
  return (left.pageRangeLabel ?? left.chapterLabel ?? left.sectionLabel ?? left.alignmentId)
    .localeCompare(right.pageRangeLabel ?? right.chapterLabel ?? right.sectionLabel ?? right.alignmentId, 'it')
}

function searchableText({ asset, document }: ProgettaItem) {
  return [asset.originalName, document?.title, document?.summary, safeMetadataText(asset.sourceMetadata)]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
}

function normalizeClassLabel(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/^CLASSE\s*/i, '')
    .replace(/[ªº°]/g, '')
    .replace(/\s+/g, '')
}

function isSectionSpecificClassLabel(value: string) {
  return /^[1-3][A-Z]$/.test(value)
}

function safeMetadataText(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}