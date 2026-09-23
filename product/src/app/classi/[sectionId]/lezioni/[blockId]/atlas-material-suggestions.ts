export type LessonAtlasSuggestion = {
  materialId: string
  lessonId: string
  title: string
  summary: string
  kind: string
  version: string
  state: 'READY'
  publicUrl: string
  provenance: string
  reason: string
  usageTip: string
}

const ATLAS_PUBLIC_BASE = 'https://antoniocorsano-boop.github.io/Curriculum-Atlas'

const ECO02_PILOT_ATLAS_MATERIAL: LessonAtlasSuggestion = {
  materialId: 'm4',
  lessonId: '2c-tec-02',
  title: 'Mappa del sistema agricolo',
  summary: 'Infografica Atlas che rappresenta il sistema agricolo attraverso risorse, processi, prodotti, relazioni e impatti.',
  kind: 'Infografica',
  version: '2026-09-23',
  state: 'READY',
  publicUrl: `${ATLAS_PUBLIC_BASE}/materials/2026-09-23/2c/mappa-sistema-agricolo.svg`,
  provenance: 'Curriculum Atlas · lezione 2c-tec-02 · materiale m4',
  reason: 'La risorsa Atlas appartiene alla sequenza pubblica “Agricoltura come sistema tecnologico” della 2C e sostiene direttamente l’obiettivo della lezione B01 sul territorio agricolo come sistema.',
  usageTip: 'Controlla la mappa su Atlas; poi puoi usarla, sostituirla o escluderla. La proposta non modifica il curricolo Arena e non entra nella lezione senza una tua scelta.',
}

export function buildAtlasLessonSuggestions(input: {
  compactSectionLabel: string
  blockId: string
  uda: string
  excludedMaterialIds: Set<string>
}): LessonAtlasSuggestion[] {
  if (
    input.compactSectionLabel.toUpperCase() !== '2C'
    || input.blockId.toUpperCase() !== 'B01'
    || input.uda !== '2-01'
    || input.excludedMaterialIds.has(ECO02_PILOT_ATLAS_MATERIAL.materialId)
  ) return []

  return [ECO02_PILOT_ATLAS_MATERIAL]
}

export function resolveAtlasMaterialSuggestion(input: {
  compactSectionLabel: string
  blockId: string
  uda: string
  materialId: string
}): LessonAtlasSuggestion | null {
  return buildAtlasLessonSuggestions({
    compactSectionLabel: input.compactSectionLabel,
    blockId: input.blockId,
    uda: input.uda,
    excludedMaterialIds: new Set(),
  }).find((item) => item.materialId === input.materialId) ?? null
}


export function activeAtlasMaterialIds(extensions: Array<{ sourceRef: string | null; status: string }>): Set<string> {
  return new Set(
    extensions.flatMap((extension) =>
      extension.status !== 'DISMISSED' && extension.sourceRef?.startsWith('atlas:')
        ? [extension.sourceRef.slice('atlas:'.length)]
        : [],
    ),
  )
}
