export type KnowledgeTaskSource = {
  assetId: string
  generationId: string
  generationNo: number
  unitId: string | null
}

export function buildKnowledgeTaskSourceRef(source: KnowledgeTaskSource): string {
  const unit = source.unitId ? `:unit:${source.unitId}` : ''
  return `kb-asset:${source.assetId}:generation:${source.generationId}:number:${source.generationNo}${unit}`
}

export function parseKnowledgeTaskSourceRef(value: string | null): KnowledgeTaskSource | null {
  if (!value) return null
  const parts = value.split(':')
  if (parts[0] !== 'kb-asset' || parts[2] !== 'generation' || parts[4] !== 'number') return null
  const generationNo = Number(parts[5])
  if (!parts[1] || !parts[3] || !Number.isInteger(generationNo) || generationNo < 1) return null
  if (parts.length > 6 && (parts[6] !== 'unit' || !parts[7])) return null
  return { assetId: parts[1], generationId: parts[3], generationNo, unitId: parts[7] ?? null }
}
