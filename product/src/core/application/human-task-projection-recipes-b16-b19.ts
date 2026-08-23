import type { HumanTaskPlanGuidedUdaProjectionRecipe } from './human-task-plan-guided-uda-projection-recipe'

const PLAN_SOURCE = {
  code: 'CAN-PLAN-1',
  generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
} as const

export const B16_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B16-PLAN-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B16:296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B16',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:7',
    udaCode: '1-03',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Segmenti, angoli, assi e bisettrici',
  },
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: null,
    blockEvidence: 'Tavola procedurale.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il Piano identifica B16 e la sua evidenza ma non ripete una riga Attività. La sequenza operativa deriva quindi dalla Fase 4 da 2 ore di UDA 1-03; il Piano resta la fonte del blocco e dell’evidenza.',
  },
  operationalPhaseOrdinal: 4,
  phaseCoverageBlockIds: ['B16'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [4, 5],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [2, 3, 6],
  },
  editorial: {
    why: 'Consolidare le costruzioni geometriche di base passando a segmenti, angoli, assi e bisettrici con una procedura leggibile e verbalizzabile.',
    objective: 'Costruire segmenti, angoli, assi e bisettrici seguendo procedure guidate e controllando precisione e sequenza.',
    assessmentNote: 'Formativa: osserva rispetto della sequenza, precisione delle costruzioni e uso del lessico geometrico-tecnico. La tavola procedurale documenta il lavoro e non genera automaticamente un voto.',
    continuation: 'La lezione successiva apre la fase di quattro ore sulle figure piane, iniziando da triangoli e quadrilateri selezionati.',
  },
}

export const B17_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B17-PLAN-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B17:296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B17',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:7',
    udaCode: '1-03',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Figure piane I',
  },
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Triangoli e quadrilateri selezionati.',
    blockEvidence: 'Tavola grafica controllata.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'UDA 1-03 aggrega le figure piane in una Fase 5 da 4 ore. CAN-PLAN-1 disambigua il primo blocco da 2 ore come triangoli e quadrilateri selezionati; il Recipe non attribuisce minuti interni né aggiunge costruzioni non nominate.',
  },
  operationalPhaseOrdinal: 5,
  phaseCoverageBlockIds: ['B17', 'B18'],
  stepSource: 'PLAN_ACTIVITY',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [4, 5],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [2, 3, 4],
  },
  editorial: {
    why: 'Applicare le procedure geometriche a figure piane riconoscibili, iniziando da triangoli e quadrilateri senza perdere il controllo della costruzione.',
    objective: 'Costruire triangoli e quadrilateri selezionati rispettando consegna, sequenza, precisione e leggibilità della tavola.',
    assessmentNote: 'Formativa: osserva procedura, precisione e ordine della tavola. La tavola grafica controllata è un’evidenza del percorso e non genera automaticamente un voto.',
    continuation: 'La seconda metà della Fase 5 prosegue con poligoni regolari selezionati, procedure e controllo.',
  },
}

export const B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B18-PLAN-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B18:296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B18',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:7',
    udaCode: '1-03',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Figure piane II',
  },
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Poligoni regolari selezionati, procedure e controllo.',
    blockEvidence: 'Tavola grafica.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'UDA 1-03 aggrega le figure piane in una Fase 5 da 4 ore. CAN-PLAN-1 disambigua il secondo blocco da 2 ore come poligoni regolari selezionati, procedure e controllo; B17+B18 coprono esattamente le quattro ore della fase.',
  },
  operationalPhaseOrdinal: 5,
  phaseCoverageBlockIds: ['B17', 'B18'],
  stepSource: 'PLAN_ACTIVITY',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [4, 5],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [2, 3, 5],
  },
  editorial: {
    why: 'Completare la fase sulle figure piane con poligoni regolari selezionati, rendendo espliciti procedura e controllo dell’errore.',
    objective: 'Costruire poligoni regolari selezionati seguendo procedure controllabili e correggendo gli errori principali.',
    assessmentNote: 'Formativa: osserva rispetto della procedura, precisione e capacità di riconoscere o correggere errori. La tavola grafica non genera automaticamente un voto.',
    continuation: 'La lezione successiva chiude UDA 1-03 con una tavola di sintesi, breve prova e autovalutazione.',
  },
}

export const B19_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B19-PLAN-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B19:296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B19',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:7',
    udaCode: '1-03',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Tavola di sintesi e verifica',
  },
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Elaborato individuale con più costruzioni e autovalutazione.',
    blockEvidence: 'Tavola VAL + breve prova.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'La Fase 6 di UDA 1-03 coincide con B19 per durata. CAN-PLAN-1 rende però più precisa la consegna e soprattutto l’evidenza finale; la vista usa il Piano per attività/evidenza e l’UDA per obiettivi e criteri.',
  },
  operationalPhaseOrdinal: 6,
  phaseCoverageBlockIds: ['B19'],
  stepSource: 'PLAN_ACTIVITY',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [4, 5],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [2, 3, 4, 5],
  },
  editorial: {
    why: 'Chiudere il percorso di disegno tecnico verificando in un unico elaborato procedura, precisione, leggibilità e capacità di autovalutazione.',
    objective: 'Produrre una tavola individuale di sintesi con più costruzioni, controllare il risultato e svolgere una breve prova conclusiva.',
    assessmentNote: 'Verifica conclusiva di UDA 1-03: la tavola VAL e la breve prova possono concorrere alla valutazione formalizzata secondo i criteri dell’UDA; l’autovalutazione resta distinta dal voto.',
    continuation: 'Con UDA 1-03 chiusa, il Piano passa a rifiuti, recupero ed economia circolare.',
  },
}

export const B16_B19_RECIPE_PROPOSALS: readonly HumanTaskPlanGuidedUdaProjectionRecipe[] = [
  B16_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B17_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B18_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B19_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
]
