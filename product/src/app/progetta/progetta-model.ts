import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'

export type ProgettaItem = { asset: KnowledgeAsset; document: KnowledgeDocument | null }
export type ProgettaGrade = 'prima' | 'seconda' | 'terza'

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

export function asProgettaGrade(value: string | undefined): ProgettaGrade | null {
  return value === 'prima' || value === 'seconda' || value === 'terza' ? value : null
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
