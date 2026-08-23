import type { HumanTaskPlanGuidedUdaProjectionRecipe } from './human-task-plan-guided-uda-projection-recipe'

const PLAN_SOURCE = {
  code: 'CAN-PLAN-1',
  generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
} as const

const UDA_GENERATION = 'da460375-d194-42ca-843b-078e73b5b814'
const PACK_GENERATION = '04127af9-0d75-41c1-a190-1fdbf480b1da'

function candidateId(blockId: string) {
  return `HTC-CANDIDATE:Prima:${blockId}:${UDA_GENERATION}:${PACK_GENERATION}`
}

export const B20_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B20-PLAN-v1',
  candidateId: candidateId('B20'),
  grade: 'Prima',
  blockId: 'B20',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:8',
    udaCode: '1-04',
    packCode: 'CAN-PACK-1E',
    supportPackCodes: [],
    title: 'Dal prodotto al rifiuto',
  },
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Fine vita, riduzione, riuso, recupero, riciclo, smaltimento.',
    blockEvidence: 'Classificazione e schema iniziale.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 assegna B20 alle prime due ore di UDA 1-04. Le Fasi 1 e 2 durano un’ora ciascuna e coprono esattamente il blocco: fine vita del prodotto e distinzione fra riduzione, riuso, recupero, riciclo e smaltimento.',
  },
  operationalPhaseOrdinals: [1, 2],
  phaseCoverageBlockIds: ['B20'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [1, 2, 6],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [1, 2, 6],
  },
  editorial: {
    why: 'Far capire che il ciclo tecnologico continua dopo l’uso del prodotto e che le diverse scelte di fine vita non sono equivalenti.',
    objective: 'Riconoscere quando un prodotto diventa rifiuto e distinguere riduzione, riuso, recupero, riciclo e smaltimento in casi semplici.',
    assessmentNote: 'Formativa: osserva la correttezza della classificazione, il lessico essenziale e la capacità di motivare semplici scelte di riduzione o riuso. Non trasformare automaticamente la classificazione in voto.',
    continuation: 'La lezione successiva ricostruisce una filiera di recupero e confronta modello lineare ed economia circolare.',
  },
}

export const B21_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B21-PLAN-v1',
  candidateId: candidateId('B21'),
  grade: 'Prima',
  blockId: 'B21',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:8',
    udaCode: '1-04',
    packCode: 'CAN-PACK-1E',
    supportPackCodes: [],
    title: 'Filiera di recupero ed economia circolare',
  },
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Ricostruzione di una filiera e confronto modello lineare/circolare.',
    blockEvidence: 'Diagramma circolare + dati essenziali.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 assegna B21 alle Fasi 3 e 4 di UDA 1-04. Le due fasi da un’ora coprono esattamente il blocco e collegano la ricostruzione di una filiera al confronto fra modello lineare e modello circolare.',
  },
  operationalPhaseOrdinals: [3, 4],
  phaseCoverageBlockIds: ['B21'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [4, 5, 7],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [3, 4, 5],
  },
  editorial: {
    why: 'Passare dalla classificazione dei rifiuti alla comprensione del percorso tecnologico che può riportare materia recuperata dentro un nuovo ciclo produttivo.',
    objective: 'Ricostruire una filiera di recupero in forma semplificata e confrontare il modello lineare con un modello circolare usando uno schema leggibile.',
    assessmentNote: 'Formativa: osserva coerenza del percorso ricostruito, riconoscimento del principio di circolarità e uso pertinente dei dati. Il diagramma è evidenza del ragionamento, non un voto automatico.',
    continuation: 'La lezione successiva applica il percorso a tre-cinque oggetti o imballaggi e chiude UDA 1-04 con dossier, verifica e autovalutazione.',
  },
}

export const B22_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B22-PLAN-v1',
  candidateId: candidateId('B22'),
  grade: 'Prima',
  blockId: 'B22',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:8',
    udaCode: '1-04',
    packCode: 'CAN-PACK-1E',
    supportPackCodes: [],
    title: 'Dallo scarto alla nuova risorsa',
  },
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Analisi di 3-5 oggetti/imballaggi e decisioni motivate.',
    blockEvidence: 'Scheda/dossier + breve verifica.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 assegna B22 alle Fasi 5 e 6 di UDA 1-04. Le due fasi da un’ora coprono esattamente il blocco. CAN-PACK-1E fornisce soltanto la scheda operativa “Dallo scarto alla nuova risorsa”; non determina la scansione temporale.',
  },
  operationalPhaseOrdinals: [5, 6],
  phaseCoverageBlockIds: ['B22'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [3, 4, 6, 8],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [1, 3, 5, 6, 7],
  },
  resources: [
    {
      id: 'STUDENT-CIRCULAR-LIFE',
      packCode: 'CAN-PACK-1E',
      heading: 'Scheda «Dallo scarto alla nuova risorsa»',
      kind: 'STUDENT_SHEET',
      surfaces: ['PREPARE'],
      attachToSteps: [1, 2],
    },
  ],
  editorial: {
    why: 'Applicare i concetti dell’UDA a oggetti reali e trasformare una scelta di fine vita in una decisione motivata, documentata e comunicabile.',
    objective: 'Analizzare tre-cinque oggetti o imballaggi, documentarne materiale, fine vita, possibile riuso o recupero e motivare almeno una scelta per ridurre lo spreco.',
    assessmentNote: 'Conclusiva per UDA 1-04: usa dossier, breve prova e osservazioni raccolte. Le regole territoriali di conferimento vanno considerate valide solo dopo verifica su una fonte istituzionale aggiornata; l’autovalutazione resta distinta dal voto.',
    continuation: 'Con UDA 1-04 chiusa, il Piano passa al processo progettuale autonomo di UDA 1-05.',
  },
}

export const B20_B22_RECIPE_PROPOSALS: readonly HumanTaskPlanGuidedUdaProjectionRecipe[] = [
  B20_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B21_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B22_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
]
