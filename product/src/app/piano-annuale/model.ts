import type { AnnualPlanGrade } from '@/core/domain/annual-plan-execution'

export type GradeKey = 'Prima' | 'Seconda' | 'Terza'

export type AnnualPlanSegment = {
  uda: string
  hours: number
  pack: string
  period: string
  focus: string
}

export type CanonicalPlanSource = {
  code: string
  assetId: string
  generationId: string
}

export const GRADE_STORAGE: Record<GradeKey, AnnualPlanGrade> = {
  Prima: 'PRIMA',
  Seconda: 'SECONDA',
  Terza: 'TERZA',
}

export const GRADE_UI: Record<AnnualPlanGrade, GradeKey> = {
  PRIMA: 'Prima',
  SECONDA: 'Seconda',
  TERZA: 'Terza',
}

export const CANONICAL_PLAN_SOURCES: Record<GradeKey, CanonicalPlanSource> = {
  Prima: {
    code: 'CAN-PLAN-1',
    assetId: '4a027986-5b6d-49db-9b52-01cfae679c08',
    generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
  },
  Seconda: {
    code: 'CAN-PLAN-2',
    assetId: '36ef3be5-925f-4e28-afff-df11097827a9',
    generationId: 'a1066c0a-2720-40b0-841e-306cb998ce3e',
  },
  Terza: {
    code: 'CAN-PLAN-3',
    assetId: '978702f8-4579-452d-925b-8e4d890e19f9',
    generationId: 'bd4cb766-5d46-4420-bc82-f979528a14b2',
  },
}

export const ANNUAL_PLAN_SEGMENTS: Record<GradeKey, AnnualPlanSegment[]> = {
  Prima: [
    { uda: '1-00', hours: 4, pack: 'CAN-PACK-1A', period: 'Settembre', focus: 'Ingresso, laboratorio e metodo' },
    { uda: '1-01', hours: 8, pack: 'CAN-PACK-1A', period: 'Settembre/Ottobre', focus: 'Bisogni, risorse e sistemi' },
    { uda: '1-02', hours: 12, pack: 'CAN-PACK-1B', period: 'Ottobre/Dicembre', focus: 'Materiali: risorsa → prodotto' },
    { uda: '1-03', hours: 6, pack: 'CAN-PACK-1B', period: 'Novembre/Dicembre', focus: 'Disegno tecnico — prima parte / Open Day' },
    { uda: '1-03', hours: 8, pack: 'CAN-PACK-1B', period: 'Gennaio/Febbraio', focus: 'Disegno tecnico — seconda parte' },
    { uda: '1-04', hours: 6, pack: 'CAN-PACK-1E', period: 'Gennaio/Febbraio', focus: 'Rifiuti, recupero ed economia circolare' },
    { uda: '1-05', hours: 10, pack: 'CAN-PACK-1C', period: 'Marzo/Aprile', focus: 'Dal problema al progetto' },
    { uda: '1-06', hours: 6, pack: 'CAN-PACK-1F', period: 'Aprile/Maggio', focus: 'Dati, informazioni e sistemi digitali' },
    { uda: '1-07', hours: 6, pack: 'CAN-PACK-1D', period: 'Maggio/Giugno', focus: 'Progetto tecnologico sostenibile' },
  ],
  Seconda: [
    { uda: '2-01', hours: 8, pack: 'CAN-PACK-2A', period: 'Settembre/Ottobre', focus: 'Agricoltura, suolo e produzioni sostenibili' },
    { uda: '2-02', hours: 8, pack: 'CAN-PACK-2B', period: 'Ottobre/Novembre', focus: 'Alimenti, trasformazione e conservazione' },
    { uda: '2-03', hours: 8, pack: 'CAN-PACK-2C', period: 'Novembre/Dicembre', focus: 'Territorio, città e pianificazione' },
    { uda: '2-06', hours: 6, pack: 'CAN-PACK-2D', period: 'Novembre/Dicembre', focus: 'Rilievo e scale — prima parte / Open Day' },
    { uda: '2-04', hours: 10, pack: 'CAN-PACK-2E', period: 'Gennaio/Febbraio', focus: 'Edificio, strutture e materiali' },
    { uda: '2-05', hours: 8, pack: 'CAN-PACK-2F', period: 'Febbraio/Marzo', focus: 'Abitazione, impianti, sicurezza ed efficienza' },
    { uda: '2-06', hours: 8, pack: 'CAN-PACK-2D', period: 'Gennaio/Aprile', focus: 'Proiezioni ortogonali — seconda parte' },
    { uda: '2-07', hours: 6, pack: 'CAN-PACK-2G', period: 'Aprile/Maggio', focus: 'Progettare uno spazio o un semplice oggetto' },
    { uda: '2-08', hours: 4, pack: 'CAN-PACK-2H', period: 'Maggio/Giugno', focus: 'Dati, rappresentazione digitale e modellazione' },
  ],
  Terza: [
    { uda: '3-01', hours: 8, pack: 'CAN-PACK-3A', period: 'Settembre/Ottobre', focus: 'Energia: forme, trasformazioni e fabbisogni' },
    { uda: '3-02', hours: 8, pack: 'CAN-PACK-3B', period: 'Ottobre/Novembre', focus: 'Fonti rinnovabili e non rinnovabili' },
    { uda: '3-03', hours: 8, pack: 'CAN-PACK-3C', period: 'Novembre/Dicembre', focus: 'Produzione, distribuzione e uso energia elettrica' },
    { uda: '3-06', hours: 6, pack: 'CAN-PACK-3D', period: 'Novembre/Dicembre', focus: 'Assonometria — prima parte / Open Day' },
    { uda: '3-04', hours: 8, pack: 'CAN-PACK-3E', period: 'Gennaio/Febbraio', focus: 'Elettricità, circuiti e sicurezza' },
    { uda: '3-05', hours: 8, pack: 'CAN-PACK-3F', period: 'Febbraio/Marzo', focus: 'Macchine, meccanismi e sistemi tecnologici' },
    { uda: '3-06', hours: 6, pack: 'CAN-PACK-3D', period: 'Gennaio/Aprile', focus: 'Assonometria e sezioni — seconda parte' },
    { uda: '3-07', hours: 6, pack: 'CAN-PACK-3G', period: 'Marzo/Aprile', focus: 'Algoritmi, reti e automazione' },
    { uda: '3-08', hours: 4, pack: 'CAN-PACK-3H', period: 'Aprile/Maggio', focus: 'Sostenibilità e scelte responsabili' },
    { uda: '3-09', hours: 4, pack: 'CAN-PACK-3I', period: 'Maggio/Giugno', focus: 'Progetto conclusivo e orientamento' },
  ],
}

export const DEFAULT_SECTION_SETS: Record<GradeKey, Array<{ code: string; status: 'PROVVISORIA' | 'DA_CONFERMARE' | 'CONFERMATA'; source: string }>> = {
  Prima: [],
  Seconda: [
    { code: 'A', status: 'PROVVISORIA', source: 'Continuità dalla 1A 2025/26' },
    { code: 'C', status: 'PROVVISORIA', source: 'Continuità dalla 1C 2025/26' },
  ],
  Terza: [
    { code: 'A', status: 'PROVVISORIA', source: 'Continuità dalla 2A 2025/26' },
    { code: 'C', status: 'PROVVISORIA', source: 'Continuità dalla 2C 2025/26' },
    { code: 'E', status: 'PROVVISORIA', source: 'Continuità dalla 2E 2025/26' },
  ],
}

export function buildBlocks(grade: GradeKey) {
  let ordinal = 1
  return ANNUAL_PLAN_SEGMENTS[grade].flatMap((segment) =>
    Array.from({ length: segment.hours / 2 }, () => ({
      id: `B${String(ordinal++).padStart(2, '0')}`,
      ...segment,
      hours: 2,
    })),
  )
}

for (const grade of ['Prima', 'Seconda', 'Terza'] as GradeKey[]) {
  const blocks = buildBlocks(grade)
  const hours = blocks.reduce((total, block) => total + block.hours, 0)
  if (blocks.length !== 33 || hours !== 66) {
    throw new Error(`CAN-PLAN ${grade}: expected 33 blocks / 66 hours, received ${blocks.length} / ${hours}`)
  }
}
