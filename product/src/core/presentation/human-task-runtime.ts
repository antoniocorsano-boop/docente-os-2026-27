import type { GradeKey } from '@/app/piano-annuale/model'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskLessonProjection as resolveLegacyHumanTaskLessonProjection,
  type HumanTaskLessonProjection,
} from './human-task-content'

type CanonicalRuntimeBlock = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  title?: string
}

const B07_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B07-v1',
  grade: 'Prima',
  blockId: 'B07',
  udaCode: '1-02',
  udaTitle: 'Materiali: dalla risorsa al prodotto',
  packCode: 'CAN-PACK-1B',
  period: 'Ottobre/Dicembre',
  title: 'Riconoscere e classificare i materiali',
  durationMinutes: 120,
  why: 'Avviare lo studio dei materiali partendo da campioni reali e distinguendo risorsa, materia prima, materiale, semilavorato e prodotto.',
  objective: 'Riconoscere e classificare materiali di uso comune usando criteri espliciti e un lessico tecnico iniziale.',
  outcomes: [
    'Distinguere risorsa naturale, materia prima, materiale, semilavorato e prodotto.',
    'Riconoscere famiglie di materiali di uso comune.',
    'Osservare e confrontare campioni o oggetti mediante criteri definiti.',
  ],
  preparation: [
    'Piccoli campioni sicuri di legno.',
    'Carta/cartone.',
    'Metallo.',
    'Plastica.',
    'Vetro.',
    'Tessuto.',
    'Materiali compositi semplici.',
  ],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Osservazione guidata di oggetti e campioni',
      instruction: 'Osservazione guidata di oggetti e campioni.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Risorsa, materia prima, materiale e prodotto',
      instruction: 'Distingui risorsa, materia prima, materiale, semilavorato e prodotto.',
    },
    {
      id: 'S03',
      minutes: null,
      title: 'Classificazione per famiglie',
      instruction: 'Classifica i materiali per famiglie.',
      resourceIds: ['STUDENT-E'],
    },
  ],
  resources: [
    {
      id: 'STUDENT-E',
      kind: 'STUDENT_SHEET',
      title: 'Carta d’identità di un materiale',
      instruction: 'Usa questa scheda nel passaggio di classificazione e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Nome materiale',
        'Famiglia',
        'Origine prevalente',
        'Aspetto',
        'Proprietà osservabili',
        'Possibili usi',
        'Un vantaggio',
        'Un limite',
        'Fine vita possibile',
        'Disegno o piccolo schema del campione',
      ],
    },
  ],
  evidence: 'Correttezza della classificazione, proprietà osservate, uso del lessico.',
  observation: [
    'Riconosce e denomina materiali.',
    'Usa criteri coerenti di classificazione.',
    'Utilizza lessico tecnico essenziale.',
  ],
  assessmentNote: 'Formativa: osserva correttezza della classificazione, proprietà riconosciute e uso del lessico. La singola scheda non viene trasformata automaticamente in voto.',
  continuation: 'La lezione successiva passa alle proprietà e alle prove comparative.',
  sourceAlignment: { level: 'DIRECT' },
  sources: [
    {
      code: 'CAN-PLAN-1',
      label: 'Piano annuale operativo Tecnologia — classe prima',
      role: 'PLAN',
      url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
    },
    {
      code: 'CAN-UDA-1-02',
      label: 'Materiali: dalla risorsa al prodotto',
      role: 'UDA',
      url: 'https://docs.google.com/document/d/1MziCI5IjvYjhHjU-rpe25ASMl48HlCQeh2FDIoJRROo/edit',
    },
    {
      code: 'CAN-PACK-1B',
      label: 'Materiali e avvio al disegno tecnico per l’Open Day',
      role: 'PACK',
      url: 'https://docs.google.com/document/d/1QnrzAD1rHWwp97r-KPUuCC8XdFNXUFqMk5hi33GxuxQ/edit',
    },
  ],
}

const APPROVED_PROJECTIONS = new Map<string, HumanTaskLessonProjection>([
  [projectionKey(B07_PRIMA.grade, B07_PRIMA.blockId), B07_PRIMA],
])

export function resolveRuntimeHumanTaskLessonProjection(
  grade: GradeKey,
  block: CanonicalRuntimeBlock,
): HumanTaskLessonProjection | null {
  const legacy = resolveLegacyHumanTaskLessonProjection(grade, block)
  if (legacy) return legacy

  const projection = APPROVED_PROJECTIONS.get(projectionKey(grade, block.id)) ?? null
  if (!projection) return null
  if (projection.grade !== grade) return null
  if (projection.blockId !== block.id.toUpperCase()) return null
  if (projection.udaCode !== block.uda) return null
  if (projection.packCode !== block.pack) return null
  if (projection.period !== block.period) return null
  if (block.title && projection.title !== block.title) return null
  if (!hasValidResourceBindings(projection)) return null
  return projection
}

export function hasRuntimeHumanTaskLessonProjection(grade: GradeKey, block: CanonicalRuntimeBlock) {
  return resolveRuntimeHumanTaskLessonProjection(grade, block) !== null
}

export { buildLessonWorkspaceHref }

function projectionKey(grade: GradeKey, blockId: string) {
  return `${grade}:${blockId.toUpperCase()}`
}

function hasValidResourceBindings(projection: HumanTaskLessonProjection) {
  const resourceIds = new Set(projection.resources.map((resource) => resource.id))
  return projection.steps.every((step) => (step.resourceIds ?? []).every((resourceId) => resourceIds.has(resourceId)))
}
