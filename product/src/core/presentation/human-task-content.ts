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
  minutes: number | null
  title: string
  instruction: string
  cue?: string
  resourceIds?: string[]
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

export type HumanTaskLessonTimingStatus = 'FULL' | 'PARTIAL' | 'MIXED' | 'UNSPECIFIED'

export type HumanTaskLessonTiming = {
  durationMinutes: number
  knownMinutes: number
  timedSteps: number
  untimedSteps: number
  unallocatedMinutes: number | null
  status: HumanTaskLessonTimingStatus
}

const COMMON_PRIMA_UDA0_SOURCES: HumanTaskContentSource[] = [
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
]

const B01_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B01-v2',
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
    { id: 'S04', minutes: 25, title: 'Osservazione individuale', instruction: 'Gli alunni lavorano con la Scheda alunno A su un oggetto semplice.', resourceIds: ['STUDENT-A'] },
    { id: 'S05', minutes: 10, title: 'Confronto a coppie', instruction: 'Fai confrontare le osservazioni e chiedi di correggere o precisare almeno un elemento.' },
    { id: 'S06', minutes: 20, title: 'Restituzione guidata', instruction: 'Ricostruisci con la classe la catena bisogno → funzione → materiale → parti.' },
    { id: 'S07', minutes: 15, title: 'Mini-sintesi', instruction: 'Fissa il significato iniziale di tecnica, tecnologia e oggetto tecnico.' },
    { id: 'S08', minutes: 5, title: 'Exit ticket', instruction: 'Chiedi una cosa capita e una domanda che rimane.', cue: 'Usalo come evidenza diagnostica, non come voto automatico.', resourceIds: ['EXIT-B01'] },
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
  continuation: 'Dopo la registrazione, la lezione successiva riguarda laboratorio, strumenti e sicurezza.',
  sources: COMMON_PRIMA_UDA0_SOURCES,
}

const B02_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B02-v1',
  grade: 'Prima',
  blockId: 'B02',
  udaCode: '1-00',
  udaTitle: 'Entrare nel laboratorio della Tecnologia',
  packCode: 'CAN-PACK-1A',
  period: 'Settembre',
  title: 'Laboratorio, strumenti e sicurezza',
  durationMinutes: 120,
  why: 'Stabilire fin dall’inizio routine sicure e responsabili per usare spazi, strumenti e materiali con ordine, precisione e collaborazione.',
  objective: 'Costruire routine operative e responsabilità nell’uso di spazi, strumenti e materiali.',
  outcomes: [
    'Riconoscere il laboratorio come ambiente regolato da procedure e comportamenti responsabili.',
    'Organizzare correttamente il posto di lavoro.',
    'Riconoscere la funzione di alcuni strumenti realmente disponibili a scuola.',
    'Collegare l’uso di uno strumento a una procedura sicura e a un errore da evitare.',
    'Contribuire a regole condivise per lavorare con ordine, precisione e responsabilità.',
  ],
  preparation: [
    'Strumenti realmente disponibili a scuola.',
    'Esempi di uso corretto e non corretto.',
    'Cartoncini oppure post-it.',
    'Scheda alunno B — Lavorare bene in Tecnologia.',
  ],
  steps: [
    { id: 'S01', minutes: null, title: 'Esplora ambiente e strumenti', instruction: 'Guida l’esplorazione dell’ambiente di lavoro e degli strumenti realmente disponibili.' },
    { id: 'S02', minutes: null, title: 'Classifica gli strumenti', instruction: 'Organizza gli esempi secondo le funzioni: misurare, tracciare, tagliare, unire, controllare.' },
    { id: 'S03', minutes: null, title: 'Ragiona su sicurezza e procedure', instruction: 'Discuti con la classe rischio, attenzione, ordine e procedura a partire da esempi concreti.' },
    { id: 'S04', minutes: null, title: 'Compila la scheda strumenti', instruction: 'Gli alunni completano la Scheda alunno B collegando funzione, uso sicuro ed errore da evitare.', resourceIds: ['STUDENT-B'] },
    { id: 'S05', minutes: null, title: 'Costruisci il Patto del laboratorio', instruction: 'Raccogli le regole condivise e costruisci con la classe il Patto del laboratorio di Tecnologia.', cue: 'Il patto può essere conservato come prodotto della classe e, se adeguato, usato anche come pannello Open Day.' },
  ],
  resources: [
    {
      id: 'STUDENT-B',
      kind: 'STUDENT_SHEET',
      title: 'Scheda alunno B — Lavorare bene in Tecnologia',
      instruction: 'Completa nel quaderno o sul foglio una scheda essenziale sugli strumenti e sulle regole di lavoro.',
      prompts: [
        'Per ogni strumento: a cosa serve?',
        'Come si usa in sicurezza?',
        'Quale errore va evitato?',
        'Indica tre regole che consideri indispensabili.',
        'Perché ordine e precisione fanno parte della Tecnologia?',
      ],
    },
  ],
  evidence: 'Scheda strumenti + Patto del laboratorio.',
  observation: [
    'Usa gli strumenti in modo corretto.',
    'Rispetta procedure e sicurezza.',
    'Organizza il posto di lavoro con sufficiente autonomia.',
    'Comprende e segue la consegna.',
    'Collabora e rispetta i ruoli.',
  ],
  assessmentNote: 'Diagnostica e formativa. La griglia UDA 0 può orientare l’osservazione; il totale numerico non deve essere automaticamente trasformato in voto.',
  continuation: 'Con il percorso di ingresso concluso, la lezione successiva passa dai bisogni alle soluzioni.',
  sources: COMMON_PRIMA_UDA0_SOURCES,
}

const PROJECTIONS = new Map<string, HumanTaskLessonProjection>([
  [projectionKey(B01_PRIMA.grade, B01_PRIMA.blockId), B01_PRIMA],
  [projectionKey(B02_PRIMA.grade, B02_PRIMA.blockId), B02_PRIMA],
])

export function resolveHumanTaskLessonProjection(grade: GradeKey, block: CanonicalBlockLike): HumanTaskLessonProjection | null {
  const projection = PROJECTIONS.get(projectionKey(grade, block.id)) ?? null
  if (!projection) return null
  if (projection.grade !== grade) return null
  if (projection.udaCode !== block.uda) return null
  if (projection.packCode !== block.pack) return null
  if (projection.period !== block.period) return null
  if (!hasValidResourceBindings(projection)) return null
  return projection
}

export function resolveHumanTaskLessonTiming(projection: HumanTaskLessonProjection): HumanTaskLessonTiming {
  const timedSteps = projection.steps.filter((step) => step.minutes !== null)
  const untimedSteps = projection.steps.length - timedSteps.length
  const knownMinutes = timedSteps.reduce((total, step) => total + (step.minutes ?? 0), 0)

  if (knownMinutes > projection.durationMinutes) {
    throw new Error(`Lesson projection ${projection.projectionId} exceeds its duration`)
  }

  if (timedSteps.length === 0) {
    return {
      durationMinutes: projection.durationMinutes,
      knownMinutes: 0,
      timedSteps: 0,
      untimedSteps,
      unallocatedMinutes: null,
      status: 'UNSPECIFIED',
    }
  }

  if (untimedSteps > 0) {
    return {
      durationMinutes: projection.durationMinutes,
      knownMinutes,
      timedSteps: timedSteps.length,
      untimedSteps,
      unallocatedMinutes: null,
      status: 'MIXED',
    }
  }

  const unallocatedMinutes = projection.durationMinutes - knownMinutes
  return {
    durationMinutes: projection.durationMinutes,
    knownMinutes,
    timedSteps: timedSteps.length,
    untimedSteps: 0,
    unallocatedMinutes,
    status: unallocatedMinutes === 0 ? 'FULL' : 'PARTIAL',
  }
}

export function resolveHumanTaskStepResources(
  projection: HumanTaskLessonProjection,
  step: HumanTaskActivityStep,
): HumanTaskResource[] {
  if (!step.resourceIds?.length) return []
  const byId = new Map(projection.resources.map((resource) => [resource.id, resource]))
  return step.resourceIds.flatMap((resourceId) => {
    const resource = byId.get(resourceId)
    return resource ? [resource] : []
  })
}

export function hasHumanTaskLessonProjection(grade: GradeKey, blockId: string) {
  return PROJECTIONS.has(projectionKey(grade, blockId))
}

export function buildLessonWorkspaceHref(sectionId: string, blockId: string, mode: 'prepare' | 'teach' | 'observe' | 'record' = 'prepare') {
  return `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId)}?mode=${mode}`
}

function hasValidResourceBindings(projection: HumanTaskLessonProjection) {
  const resourceIds = projection.resources.map((resource) => resource.id)
  if (new Set(resourceIds).size !== resourceIds.length) return false
  const knownIds = new Set(resourceIds)
  return projection.steps.every((step) => (step.resourceIds ?? []).every((resourceId) => knownIds.has(resourceId)))
}

function projectionKey(grade: GradeKey, blockId: string) {
  return `${grade}:${blockId.toUpperCase()}`
}
