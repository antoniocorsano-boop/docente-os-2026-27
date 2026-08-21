import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'

export type ProgettaItem = { asset: KnowledgeAsset; document: KnowledgeDocument | null }

export type ProgettaGroup = {
  key: 'programming' | 'uda' | 'materials'
  title: string
  description: string
  items: ProgettaItem[]
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
