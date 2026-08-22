import type { GradeKey } from '@/app/piano-annuale/model'

type CanonicalBlockLike = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
}

export type HumanTaskContentSource = {
  code: string
  label: string
  url: string
  role: 'PLAN' | 'UDA' | 'PACK'
}

export type HumanTaskActivityStep = {
  id: string
  minutes: number
  title: string
  instruction: string
  cue?: string
}

export type HumanTaskResource = {
  id: string
  kind: 'STUDENT_SHEET' | 'EXIT_TICKET'
  title: string
  instruction: string
  prompts: string[]
}

export type HumanTaskLessonProjection = {
  projectionId: string
  grade: GradeKey
  blockId: string
  udaCode: string
  udaTitle: string
  packCode: string
  period: string
  title: string
  durationMinutes: number
  why: string
  objective: string
  outcomes: string[]
  preparation: string[]
  steps: HumanTaskActivityStep[]
  resources: HumanTaskResource[]
  evidence: string
  observation: string[]
  assessmentNote: string
  continuation: string
  sources: HumanTaskContentSource[]
}

export type HumanTaskLessonTiming = {
  durationMinutes: number
  guidedMinutes: number
  flexibleMinutes: number
}

const B01_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B01-v1',
  grade: 'Prima',
  blockId: 'B01',
  udaCode: '1-00',
  udaTitle: 'Entrare nel laboratorio della Tecnologia',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre',
  title: 'Che cos’è Tecnologia?',
  durationMinutes: 120,
  why: 'Avviare il percorso facendo emergere le idee iniziali degli alunni e introducendo il metodo di osservazione di un oggetto tecnico.',
  objective: 'Far emergere preconoscenze, distinguere tecnica e tecnologia e introdurre il metodo di osservazione.',
  outcomes: [
    'Riconoscere che un oggetto tecnico risponde a un bisogno.',
    'Distinguere in modo iniziale bisogno, funzione, parti e materiali.',
    'Usare un primo lessico tecnico comprensibile.',
    'Osservare prima di formulare giudizi.',
  ],
  preparation: [
    '4–6 oggetti tecnici semplici e diversi tra loro.',
    'Fogli A4 oppure quaderno di Tecnologia.',
    'Matita e righello.',
    'LIM o lavagna.',
    'Una scatola o un vassoio per gli oggetti.',
    'Scheda alunno A — Osservo un oggetto tecnico.',
  ],
  steps: [
    { id: 'S01', minutes: 10, title: 'Domanda-stimolo', instruction: 'Chiedi: “Dove vedi la Tecnologia nella tua giornata?”' },
    { id: 'S02', minutes: 10, title: 'Raccogli le idee', instruction: 'Raccogli rapidamente alla lavagna parole, esempi e associazioni iniziali.' },
    { id: 'S03', minutes: 15, title: 'Modella l’osservazione', instruction: 'Presenta un oggetto tecnico e mostra come passare da ciò che si vede a bisogno, funzione, parti e materiali.' },
    { id: 'S04', minutes: 25, title: 'Osservazione individuale', instruction: 'Gli alunni lavorano con la Scheda alunno A su un oggetto semplice.' },
    { id: 'S05', minutes: 10, title: 'Confronto a coppie', instruction: 'Fai confrontare le osservazioni e chiedi di correggere o precisare almeno un elemento.' },
    { id: 'S06', minutes: 20, title: 'Restituzione guidata', instruction: 'Ricostruisci con la classe la catena bisogno → funzione → materiale → parti.' },
    { id: 'S07', minutes: 15, title: 'Mini-sintesi', instruction: 'Fissa il significato iniziale di tecnica, tecnologia e oggetto tecnico.' },
    { id: 'S08', minutes: 5, title: 'Exit ticket', instruction: 'Chiedi una cosa capita e una domanda che rimane.', cue: 'Usalo come evidenza diagnostica, non come voto automatico.' },
  ],
  resources: [
    {
      id: 'STUDENT-A',
      kind: 'STUDENT_SHEET',
      title: 'Scheda alunno A — Osservo un oggetto tecnico',
      instruction: 'Guida una osservazione semplice e documentabile dell’oggetto scelto.',
      prompts: [
        'A quale bisogno risponde?',
        'Qual è la sua funzione principale?',
        'Da quali parti è formato?',
        'Quali materiali riconosci?',
        'Come viene usato correttamente?',
        'Quale caratteristica lo rende adatto alla funzione?',
        'Disegna uno schizzo semplice e indica almeno due parti.',
        'Completa: “Questo oggetto è una soluzione tecnologica perché…”',
      ],
    },
    {
      id: 'EXIT-B01',
      kind: 'EXIT_TICKET',
      title: 'Exit ticket',
      instruction: 'Chiusura rapida della lezione.',
      prompts: ['Una cosa che ho capito…', 'Una domanda che mi rimane…'],
    },
  ],
  evidence: 'Scheda di osservazione di un oggetto tecnico + exit ticket.',
  observation: [
    'Riconosce il bisogno cui risponde l’oggetto.',
    'Distingue funzione e forma.',
    'Individua almeno un materiale.',
    'Usa un lessico tecnico iniziale.',
    'Osserva prima di formulare giudizi.',
  ],
  assessmentNote: 'Diagnostica e formativa. Le evidenze servono a conoscere il punto di partenza della classe e non devono essere trasformate automaticamente in voto.',
  continuation: 'Dopo la registrazione, il piano passa a B02: Laboratorio, strumenti e sicurezza.',
  sources: [
    {
      code: 'CAN-PLAN-1',
      label: 'Piano annuale operativo Tecnologia — classe prima',
      role: 'PLAN',
      url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
    },
    {
      code: 'CAN-UDA-1-00',
      label: 'Entrare nel laboratorio della Tecnologia',
      role: 'UDA',
      url: 'https://docs.google.com/document/d/1YyHBEsKJVdYEqyEdPmJp6f_SOCEWfLibA1Mv3ApMJPw/edit',
    },
    {
      code: 'CAN-PACK-1A',
      label: 'Pacchetto operativo di avvio classe prima',
      role: 'PACK',
      url: 'https://docs.google.com/document/d/1vVoF3z1QigzA1S5WnXiqCTe2bvMD08PwWmVv9s5bvR8/edit',
    },
  ],
}

const PROJECTIONS = new Map<string, HumanTaskLessonProjection>([
  [projectionKey(B01_PRIMA.grade, B01_PRIMA.blockId), B01_PRIMA],
])

export function resolveHumanTaskLessonProjection(grade: GradeKey, block: CanonicalBlockLike): HumanTaskLessonProjection | null {
  const projection = PROJECTIONS.get(projectionKey(grade, block.id)) ?? null
  if (!projection) return null
  if (projection.grade !== grade) return null
  if (projection.udaCode !== block.uda) return null
  if (projection.packCode !== block.pack) return null
  if (projection.period !== block.period) return null
  return projection
}

export function resolveHumanTaskLessonTiming(projection: HumanTaskLessonProjection): HumanTaskLessonTiming {
  const guidedMinutes = projection.steps.reduce((total, step) => total + step.minutes, 0)
  if (guidedMinutes > projection.durationMinutes) {
    throw new Error(`Lesson projection ${projection.projectionId} exceeds its duration`)
  }
  return {
    durationMinutes: projection.durationMinutes,
    guidedMinutes,
    flexibleMinutes: projection.durationMinutes - guidedMinutes,
  }
}

export function hasHumanTaskLessonProjection(grade: GradeKey, blockId: string) {
  return PROJECTIONS.has(projectionKey(grade, blockId))
}

export function buildLessonWorkspaceHref(sectionId: string, blockId: string, mode: 'prepare' | 'teach' | 'observe' | 'record' = 'prepare') {
  return `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId)}?mode=${mode}`
}

function projectionKey(grade: GradeKey, blockId: string) {
  return `${grade}:${blockId.toUpperCase()}`
}
