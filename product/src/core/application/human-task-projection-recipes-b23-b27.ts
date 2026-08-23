import type { HumanTaskPlanGuidedUdaProjectionRecipe } from './human-task-plan-guided-uda-projection-recipe'

const PLAN_SOURCE = {
  code: 'CAN-PLAN-1',
  generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
} as const

const UDA_GENERATION = '9c70abfe-9d45-4977-9551-6b745778f248'
const PACK_GENERATION = '2f1da16d-45b4-42aa-841a-09d283d5d96a'

function candidateId(blockId: string) {
  return `HTC-CANDIDATE:Prima:${blockId}:${UDA_GENERATION}:${PACK_GENERATION}`
}

function baseBinding(blockId: string, title: string) {
  return {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:9',
    udaCode: '1-05',
    packCode: 'CAN-PACK-1C',
    supportPackCodes: [],
    title,
  } as const
}

export const B23_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B23-PLAN-v1',
  candidateId: candidateId('B23'),
  grade: 'Prima',
  blockId: 'B23',
  planBinding: baseBinding('B23', 'Dal bisogno al problema'),
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Bisogno, problema, destinatario, requisiti e vincoli.',
    blockEvidence: 'Brief progettuale.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B23 coincide esattamente con la Fase 1 da 2 ore di UDA 1-05. CAN-PACK-1C resta il repertorio metodologico indicato dal Piano, ma il suo monte ore Open Day non viene usato per determinare tempi o passaggi della lezione.',
  },
  operationalPhaseOrdinal: 1,
  phaseCoverageBlockIds: ['B23'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [1, 2],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [1, 2],
  },
  editorial: {
    why: 'Trasformare un bisogno osservabile in un problema progettuale comprensibile, prima di cercare soluzioni.',
    objective: 'Distinguere bisogno, problema, requisito, vincolo e soluzione e formulare un problema progettuale semplice con destinatario e funzione riconoscibili.',
    assessmentNote: 'Formativa: osserva chiarezza del problema e pertinenza di requisiti e vincoli. Il brief documenta l’avvio del progetto e non genera automaticamente un voto.',
    continuation: 'La lezione successiva raccoglie informazioni utili e produce almeno due alternative progettuali con schizzi preliminari.',
  },
}

export const B24_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B24-PLAN-v1',
  candidateId: candidateId('B24'),
  grade: 'Prima',
  blockId: 'B24',
  planBinding: baseBinding('B24', 'Informazioni e alternative'),
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Raccolta dati, almeno due idee, schizzi preliminari.',
    blockEvidence: 'Dossier alternative.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B24 coincide esattamente con la Fase 2 da 2 ore di UDA 1-05. La fase UDA conserva sia la ricerca di informazioni sia la generazione di alternative; CAN-PACK-1C non viene usato per sostituire questa sequenza con la sola logica Open Day.',
  },
  operationalPhaseOrdinal: 2,
  phaseCoverageBlockIds: ['B24'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [3, 4],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [3],
  },
  editorial: {
    why: 'Evitare la prima idea disponibile e fondare l’ideazione su informazioni pertinenti e alternative confrontabili.',
    objective: 'Raccogliere dati utili, produrre almeno due ipotesi progettuali e rappresentarle con schizzi preliminari comprensibili.',
    assessmentNote: 'Formativa: osserva pertinenza delle informazioni, presenza di più alternative e chiarezza degli schizzi. Il dossier delle alternative resta evidenza di processo.',
    continuation: 'La lezione successiva definisce criteri espliciti, confronta le alternative e porta a una scelta motivata.',
  },
}

export const B25_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B25-PLAN-v1',
  candidateId: candidateId('B25'),
  grade: 'Prima',
  blockId: 'B25',
  planBinding: baseBinding('B25', 'Confrontare e scegliere'),
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Criteri funzionalità-fattibilità-materiali-sicurezza-sprechi.',
    blockEvidence: 'Matrice di scelta motivata.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B25 coincide esattamente con la Fase 3 da 2 ore di UDA 1-05. Il Piano sintetizza i criteri chiave e l’UDA aggiunge il costo indicativo; nessun punteggio o peso ulteriore viene inventato.',
  },
  operationalPhaseOrdinal: 3,
  phaseCoverageBlockIds: ['B25'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [5],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [4],
  },
  editorial: {
    why: 'Rendere la scelta progettuale verificabile e argomentata, invece di trattarla come preferenza personale.',
    objective: 'Confrontare le alternative con criteri espliciti di funzionalità, fattibilità, materiali, sicurezza, costo indicativo e riduzione degli sprechi e motivare la scelta finale.',
    assessmentNote: 'Formativa: osserva uso coerente dei criteri e capacità di motivare la decisione. La matrice rende trasparente il ragionamento ma non produce automaticamente un voto numerico.',
    continuation: 'La soluzione scelta viene poi rappresentata e trasformata in un piano di lavoro con misure, materiali, strumenti e ordine delle operazioni.',
  },
}

export const B26_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B26-PLAN-v1',
  candidateId: candidateId('B26'),
  grade: 'Prima',
  blockId: 'B26',
  planBinding: baseBinding('B26', 'Rappresentare e pianificare'),
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Schizzo/disegno, misure, materiali, strumenti, sequenza operativa.',
    blockEvidence: 'Tavola progettuale + piano di lavoro.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B26 coincide esattamente con la Fase 4 da 2 ore di UDA 1-05. La vista usa la fase UDA per mantenere insieme rappresentazione e pianificazione senza assumere i tempi interni delle fasi 5-6 del repertorio Open Day.',
  },
  operationalPhaseOrdinal: 4,
  phaseCoverageBlockIds: ['B26'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [6, 7, 8],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [5, 6, 7],
  },
  editorial: {
    why: 'Passare da un’idea scelta a istruzioni abbastanza chiare da poter essere realizzate e controllate.',
    objective: 'Rappresentare la soluzione con misure essenziali, individuare materiali e strumenti e predisporre una sequenza operativa sicura e comprensibile.',
    assessmentNote: 'Formativa: osserva leggibilità della rappresentazione, coerenza di materiali e strumenti e completezza della sequenza operativa. Tavola e piano di lavoro restano due evidenze dello stesso processo.',
    continuation: 'La lezione successiva realizza o simula il modello, lo prova rispetto ai requisiti e documenta correzioni e miglioramenti.',
  },
}

export const B27_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B27-PLAN-v1',
  candidateId: candidateId('B27'),
  grade: 'Prima',
  blockId: 'B27',
  planBinding: baseBinding('B27', 'Realizzare, verificare, migliorare'),
  planSource: {
    ...PLAN_SOURCE,
    blockActivity: 'Modello/prototipo o simulazione, prova e revisione.',
    blockEvidence: 'Dossier completo + presentazione.',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B27 coincide esattamente con la Fase 5 da 2 ore di UDA 1-05. CAN-PACK-1C contiene indicazioni più granulari per prototipo, prova e miglioramento, ma il Recipe non comprime quel repertorio né ne riusa il monte ore Open Day.',
  },
  operationalPhaseOrdinal: 5,
  phaseCoverageBlockIds: ['B27'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [9, 10, 11],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [7, 8, 9],
  },
  editorial: {
    why: 'Chiudere il processo progettuale usando la prova come confronto con i requisiti iniziali e il miglioramento come conseguenza delle evidenze raccolte.',
    objective: 'Realizzare o simulare un modello, verificarlo rispetto ai requisiti, individuare difetti o correzioni e presentare sinteticamente il percorso seguito.',
    assessmentNote: 'Conclusiva per UDA 1-05: integra dossier progettuale, qualità della soluzione, prova rispetto ai requisiti e capacità di spiegare il processo. La proposta di miglioramento è parte dell’evidenza e non va confusa con una penalizzazione automatica del primo prototipo.',
    continuation: 'Con UDA 1-05 chiusa, il Piano passa a informazioni, dati e sistemi digitali.',
  },
}

export const B23_B27_RECIPE_PROPOSALS: readonly HumanTaskPlanGuidedUdaProjectionRecipe[] = [
  B23_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B24_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B25_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B26_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
  B27_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL,
]
