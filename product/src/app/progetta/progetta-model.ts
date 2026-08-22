import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'

export type ProgettaItem = { asset: KnowledgeAsset; document: KnowledgeDocument | null }
export type ProgettaGrade = 'prima' | 'seconda' | 'terza'

export type ProgettaFocus = {
  blockId: string | null
  uda: string | null
  pack: string | null
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
    const labels = asset.classLabels ?? []
    return !labels.length || labels.some((label) => normalizeClassLabel(label) === target)
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

export function filterProgettaItemsByFocus(items: ProgettaItem[], focus: ProgettaFocus | null) {
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

function searchableText({ asset, document }: ProgettaItem) {
  return [asset.originalName, document?.title, document?.summary, safeMetadataText(asset.sourceMetadata)]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()
}

function normalizeClassLabel(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase()
}

function safeMetadataText(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}
