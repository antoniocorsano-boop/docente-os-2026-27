import type { HumanTaskLessonProjection } from './human-task-content'

const PLAN_PRIMA: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-PLAN-1',
  label: 'Piano annuale operativo Tecnologia — classe prima',
  role: 'PLAN',
  url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
}

const UDA_103: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-UDA-1-03',
  label: 'Disegnare per comprendere e comunicare',
  role: 'UDA',
  url: 'https://docs.google.com/document/d/1E_IDcyTa43MYlyZE7wdowakF3royRfe69IGQR4xMx68/edit',
}

const B16_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B16-PLAN-v1',
  grade: 'Prima',
  blockId: 'B16',
  udaCode: '1-03',
  udaTitle: 'Disegnare per comprendere e comunicare',
  packCode: 'CAN-PACK-1B',
  period: 'Gennaio/Febbraio',
  title: 'Segmenti, angoli, assi e bisettrici',
  durationMinutes: 120,
  why: 'Consolidare le costruzioni geometriche di base passando a segmenti, angoli, assi e bisettrici con una procedura leggibile e verbalizzabile.',
  objective: 'Costruire segmenti, angoli, assi e bisettrici seguendo procedure guidate e controllando precisione e sequenza.',
  outcomes: [
    'Costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane.',
    'Effettuare semplici misurazioni e riportare misure in modo ordinato.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Segmenti, angoli, assi e bisettrici',
      instruction: 'Costruzioni geometriche guidate con verbalizzazione delle procedure.',
    },
  ],
  resources: [],
  evidence: 'Tavola procedurale.',
  observation: [
    'Rispetto della sequenza operativa.',
    'Precisione di linee, intersezioni e costruzioni.',
    'Uso corretto del lessico geometrico-tecnico.',
  ],
  assessmentNote: 'Formativa: osserva rispetto della sequenza, precisione delle costruzioni e uso del lessico geometrico-tecnico. La tavola procedurale documenta il lavoro e non genera automaticamente un voto.',
  continuation: 'La lezione successiva apre la fase di quattro ore sulle figure piane, iniziando da triangoli e quadrilateri selezionati.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il Piano identifica B16 e la sua evidenza ma non ripete una riga Attività. La sequenza operativa deriva quindi dalla Fase 4 da 2 ore di UDA 1-03; il Piano resta la fonte del blocco e dell’evidenza.',
  },
  sources: [PLAN_PRIMA, UDA_103],
}

const B17_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B17-PLAN-v1',
  grade: 'Prima',
  blockId: 'B17',
  udaCode: '1-03',
  udaTitle: 'Disegnare per comprendere e comunicare',
  packCode: 'CAN-PACK-1B',
  period: 'Gennaio/Febbraio',
  title: 'Figure piane I',
  durationMinutes: 120,
  why: 'Applicare le procedure geometriche a figure piane riconoscibili, iniziando da triangoli e quadrilateri senza perdere il controllo della costruzione.',
  objective: 'Costruire triangoli e quadrilateri selezionati rispettando consegna, sequenza, precisione e leggibilità della tavola.',
  outcomes: [
    'Costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane.',
    'Effettuare semplici misurazioni e riportare misure in modo ordinato.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Figure piane I',
      instruction: 'Triangoli e quadrilateri selezionati.',
    },
  ],
  resources: [],
  evidence: 'Tavola grafica controllata.',
  observation: [
    'Rispetto della sequenza operativa.',
    'Precisione di linee, intersezioni e costruzioni.',
    'Ordine e leggibilità della tavola.',
  ],
  assessmentNote: 'Formativa: osserva procedura, precisione e ordine della tavola. La tavola grafica controllata è un’evidenza del percorso e non genera automaticamente un voto.',
  continuation: 'La seconda metà della Fase 5 prosegue con poligoni regolari selezionati, procedure e controllo.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'UDA 1-03 aggrega le figure piane in una Fase 5 da 4 ore. CAN-PLAN-1 disambigua il primo blocco da 2 ore come triangoli e quadrilateri selezionati; il Recipe non attribuisce minuti interni né aggiunge costruzioni non nominate.',
  },
  sources: [PLAN_PRIMA, UDA_103],
}

const B18_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B18-PLAN-v1',
  grade: 'Prima',
  blockId: 'B18',
  udaCode: '1-03',
  udaTitle: 'Disegnare per comprendere e comunicare',
  packCode: 'CAN-PACK-1B',
  period: 'Gennaio/Febbraio',
  title: 'Figure piane II',
  durationMinutes: 120,
  why: 'Completare la fase sulle figure piane con poligoni regolari selezionati, rendendo espliciti procedura e controllo dell’errore.',
  objective: 'Costruire poligoni regolari selezionati seguendo procedure controllabili e correggendo gli errori principali.',
  outcomes: [
    'Costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane.',
    'Effettuare semplici misurazioni e riportare misure in modo ordinato.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Figure piane II',
      instruction: 'Poligoni regolari selezionati, procedure e controllo.',
    },
  ],
  resources: [],
  evidence: 'Tavola grafica.',
  observation: [
    'Rispetto della sequenza operativa.',
    'Precisione di linee, intersezioni e costruzioni.',
    'Capacità di riconoscere e correggere errori.',
  ],
  assessmentNote: 'Formativa: osserva rispetto della procedura, precisione e capacità di riconoscere o correggere errori. La tavola grafica non genera automaticamente un voto.',
  continuation: 'La lezione successiva chiude UDA 1-03 con una tavola di sintesi, breve prova e autovalutazione.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'UDA 1-03 aggrega le figure piane in una Fase 5 da 4 ore. CAN-PLAN-1 disambigua il secondo blocco da 2 ore come poligoni regolari selezionati, procedure e controllo; B17+B18 coprono esattamente le quattro ore della fase.',
  },
  sources: [PLAN_PRIMA, UDA_103],
}

const B19_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B19-PLAN-v1',
  grade: 'Prima',
  blockId: 'B19',
  udaCode: '1-03',
  udaTitle: 'Disegnare per comprendere e comunicare',
  packCode: 'CAN-PACK-1B',
  period: 'Gennaio/Febbraio',
  title: 'Tavola di sintesi e verifica',
  durationMinutes: 120,
  why: 'Chiudere il percorso di disegno tecnico verificando in un unico elaborato procedura, precisione, leggibilità e capacità di autovalutazione.',
  objective: 'Produrre una tavola individuale di sintesi con più costruzioni, controllare il risultato e svolgere una breve prova conclusiva.',
  outcomes: [
    'Costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane.',
    'Effettuare semplici misurazioni e riportare misure in modo ordinato.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Tavola di sintesi e verifica',
      instruction: 'Elaborato individuale con più costruzioni e autovalutazione.',
    },
  ],
  resources: [],
  evidence: 'Tavola VAL + breve prova.',
  observation: [
    'Rispetto della sequenza operativa.',
    'Precisione di linee, intersezioni e costruzioni.',
    'Ordine e leggibilità della tavola.',
    'Capacità di riconoscere e correggere errori.',
  ],
  assessmentNote: 'Verifica conclusiva di UDA 1-03: la tavola VAL e la breve prova possono concorrere alla valutazione formalizzata secondo i criteri dell’UDA; l’autovalutazione resta distinta dal voto.',
  continuation: 'Con UDA 1-03 chiusa, il Piano passa a rifiuti, recupero ed economia circolare.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'La Fase 6 di UDA 1-03 coincide con B19 per durata. CAN-PLAN-1 rende però più precisa la consegna e soprattutto l’evidenza finale; la vista usa il Piano per attività/evidenza e l’UDA per obiettivi e criteri.',
  },
  sources: [PLAN_PRIMA, UDA_103],
}

export const APPROVED_HUMAN_TASK_PROJECTIONS_B16_B19: readonly HumanTaskLessonProjection[] = [
  B16_PRIMA,
  B17_PRIMA,
  B18_PRIMA,
  B19_PRIMA,
]
