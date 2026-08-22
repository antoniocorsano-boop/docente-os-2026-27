import type { HumanTaskPackComposedProjectionRecipe } from './human-task-pack-composed-projection-recipe'
import type { HumanTaskProjectionRecipe } from './human-task-projection-recipe'

export const B11_PRIMA_RECIPE_PROPOSAL: HumanTaskProjectionRecipe = {
  recipeId: 'HTC-RECIPE-PRIMA-B11-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B11:296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B11',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:4',
    udaCode: '1-03',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Entrare nel disegno tecnico',
  },
  sourceAlignment: { level: 'DIRECT' },
  guide: {
    packCode: 'CAN-PACK-1B',
    heading: '5. LEZIONE 8 — ENTRARE NEL DISEGNO TECNICO (2 h)',
  },
  supportingUdaPhaseOrdinals: [1, 2],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [1, 2, 7],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [1, 4, 6],
  },
  resources: [
    {
      id: 'STUDENT-H',
      packCode: 'CAN-PACK-1B',
      heading: 'TAVOLA H — IL MIO PRIMO FOGLIO TECNICO',
      kind: 'STUDENT_SHEET',
      surfaces: ['PREPARE'],
      attachToStep: 4,
    },
  ],
  editorial: {
    why: 'Aprire il linguaggio grafico-tecnico distinguendolo dal disegno libero e costruendo fin dall’inizio ordine, cura degli strumenti e leggibilità.',
    objective: 'Distinguere disegno libero, geometrico e tecnico e impostare correttamente un primo foglio usando gli strumenti fondamentali.',
    assessmentNote: 'Formativa: osserva uso degli strumenti, ordine del foglio, leggibilità e lessico. La prima tavola documenta il punto di partenza e non genera automaticamente un voto.',
    continuation: 'La lezione successiva passa alle costruzioni fondamentali e al controllo dell’errore.',
  },
}

export const B12_PRIMA_RECIPE_PROPOSAL: HumanTaskProjectionRecipe = {
  recipeId: 'HTC-RECIPE-PRIMA-B12-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B12:296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B12',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:4',
    udaCode: '1-03',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Costruzioni fondamentali e controllo dell’errore',
  },
  sourceAlignment: { level: 'DIRECT' },
  guide: {
    packCode: 'CAN-PACK-1B',
    heading: '6. LEZIONE 9 — COSTRUZIONI DI BASE E CONTROLLO DELL’ERRORE (2 h)',
  },
  supportingUdaPhaseOrdinals: [3, 4],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [3, 4],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [2, 3, 5],
  },
  resources: [],
  editorial: {
    why: 'Passare dall’impostazione del foglio a procedure geometriche controllabili, facendo dell’errore un elemento da riconoscere e correggere.',
    objective: 'Eseguire costruzioni di base seguendo una sequenza e confrontare un procedimento corretto con un risultato approssimativo.',
    assessmentNote: 'Formativa: osserva rispetto della sequenza, precisione delle costruzioni e capacità di riconoscere o correggere errori. La tavola non genera automaticamente un voto.',
    continuation: 'Il percorso si raccorda ora al micro-progetto trasversale senza attribuire ore formali alle UDA progettuali successive.',
  },
}

export const B13_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL: HumanTaskPackComposedProjectionRecipe = {
  mode: 'PACK_COMPOSED',
  recipeId: 'HTC-RECIPE-PRIMA-B13-PACK-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B13:5e0d5ae7-9f43-4d55-b470-533f2ac806fe:1902bdd3-c65f-46c0-b419-99bcd45131ad:2f1da16d-45b4-42aa-841a-09d283d5d96a',
  grade: 'Prima',
  blockId: 'B13',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:5',
    udaCode: '1-02',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: ['CAN-PACK-1C'],
    title: 'Materiali, requisiti e micro-progetto trasversale',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Le ore restano contabilizzate in UDA 1-02. CAN-PACK-1C fornisce il repertorio operativo del micro-progetto per problema, requisiti e due idee; CAN-PACK-1B resta il pacchetto principale del segmento ma non viene usato per inventare una guida parallela.',
  },
  steps: [
    { packCode: 'CAN-PACK-1C', source: { mode: 'HEADING', heading: 'FASE 1 — INDIVIDUARE IL PROBLEMA', endHeading: 'Scheda 1 — IL PROBLEMA' } },
    { packCode: 'CAN-PACK-1C', source: { mode: 'HEADING', heading: 'FASE 2 — DEFINIRE REQUISITI E VINCOLI', endHeading: 'Scheda 2 — REQUISITI' } },
    { packCode: 'CAN-PACK-1C', source: { mode: 'HEADING', heading: 'FASE 3 — PRODURRE DUE IDEE', endHeading: 'Scheda 3 — DUE SOLUZIONI POSSIBILI' } },
  ],
  resources: [
    { id: 'PROJECT-PROBLEM', packCode: 'CAN-PACK-1C', heading: 'Scheda 1 — IL PROBLEMA', endHeading: 'FASE 2 — DEFINIRE REQUISITI E VINCOLI', kind: 'STUDENT_SHEET', surfaces: ['PREPARE'], attachToStep: 1 },
    { id: 'PROJECT-REQ', packCode: 'CAN-PACK-1C', heading: 'Scheda 2 — REQUISITI', endHeading: 'FASE 3 — PRODURRE DUE IDEE', kind: 'STUDENT_SHEET', surfaces: ['PREPARE'], attachToStep: 2 },
    { id: 'PROJECT-IDEAS', packCode: 'CAN-PACK-1C', heading: 'Scheda 3 — DUE SOLUZIONI POSSIBILI', endHeading: 'FASE 4 — SCEGLIERE CON CRITERI', kind: 'STUDENT_SHEET', surfaces: ['PREPARE'], attachToStep: 3 },
  ],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [3, 7, 9],
  },
  evidence: [{ mode: 'RESOURCE_TITLES', resourceIds: ['PROJECT-PROBLEM', 'PROJECT-REQ', 'PROJECT-IDEAS'] }],
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [5, 7, 9],
  },
  editorial: {
    why: 'Usare ciò che la classe ha imparato sui materiali dentro un problema concreto, senza anticipare formalmente l’intera UDA sul processo progettuale.',
    objective: 'Definire un problema semplice, esplicitare requisiti e vincoli e produrre due soluzioni confrontabili indicando il materiale principale.',
    assessmentNote: 'Formativa: osserva la coerenza tra problema, requisiti, alternative e motivazioni sui materiali. Il micro-progetto resta un raccordo interno a UDA 1-02 e non genera automaticamente un voto autonomo.',
    continuation: 'La lezione successiva confronta le alternative, seleziona una soluzione e la sottopone a una prova semplice.',
  },
}

export const B14_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL: HumanTaskPackComposedProjectionRecipe = {
  mode: 'PACK_COMPOSED',
  recipeId: 'HTC-RECIPE-PRIMA-B14-PACK-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B14:5e0d5ae7-9f43-4d55-b470-533f2ac806fe:1902bdd3-c65f-46c0-b419-99bcd45131ad:2f1da16d-45b4-42aa-841a-09d283d5d96a',
  grade: 'Prima',
  blockId: 'B14',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:5',
    udaCode: '1-02',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: ['CAN-PACK-1C'],
    title: 'Confronto, scelta e prova del micro-progetto',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Le ore restano UDA 1-02. La vista seleziona da CAN-PACK-1C soltanto scelta con criteri, prototipo semplice e prova; non assume che l’intero pacchetto di otto ore coincida con questo blocco da due ore.',
  },
  steps: [
    { packCode: 'CAN-PACK-1C', source: { mode: 'HEADING', heading: 'FASE 4 — SCEGLIERE CON CRITERI', endHeading: 'Scheda 4 — MATRICE DI SCELTA' } },
    { packCode: 'CAN-PACK-1C', source: { mode: 'BODY', heading: 'FASE 7 — REALIZZARE IL PROTOTIPO', endHeading: 'FASE 8 — PROVARE' } },
    { packCode: 'CAN-PACK-1C', source: { mode: 'HEADING', heading: 'FASE 8 — PROVARE', endHeading: 'Scheda 7 — LA PROVA' } },
  ],
  resources: [
    { id: 'PROJECT-CHOICE', packCode: 'CAN-PACK-1C', heading: 'Scheda 4 — MATRICE DI SCELTA', endHeading: 'FASE 5 — TAVOLA PROGETTUALE', kind: 'STUDENT_SHEET', surfaces: ['PREPARE'], attachToStep: 1 },
    { id: 'PROJECT-TEST', packCode: 'CAN-PACK-1C', heading: 'Scheda 7 — LA PROVA', endHeading: 'FASE 9 — MIGLIORARE', kind: 'STUDENT_SHEET', surfaces: ['PREPARE'], attachToStep: 3 },
  ],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [5, 7, 9],
  },
  evidence: [{ mode: 'RESOURCE_TITLES', resourceIds: ['PROJECT-CHOICE', 'PROJECT-TEST'] }],
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [3, 7, 9],
  },
  editorial: {
    why: 'Trasformare il confronto sui materiali in una decisione verificabile, usando un prototipo semplice o una simulazione come mezzo di prova e non come lavoretto fine a se stesso.',
    objective: 'Scegliere una soluzione con criteri espliciti, realizzare o simulare un prototipo semplice e documentare una prova collegata ai requisiti.',
    assessmentNote: 'Formativa e prestazionale: osserva coerenza della scelta, rispetto delle consegne e capacità di documentare la prova. La chiusura di UDA 1-02 usa le evidenze raccolte senza duplicare automaticamente la valutazione.',
    continuation: 'Il primo periodo prosegue con una composizione geometrica controllata e la restituzione Open Day collegata a UDA 1-03.',
  },
}

export const B15_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL: HumanTaskPackComposedProjectionRecipe = {
  mode: 'PACK_COMPOSED',
  recipeId: 'HTC-RECIPE-PRIMA-B15-PACK-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B15:296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c:1902bdd3-c65f-46c0-b419-99bcd45131ad:2f1da16d-45b4-42aa-841a-09d283d5d96a:1d150f77-6a7f-4f8b-8e85-2fa370956e29',
  grade: 'Prima',
  blockId: 'B15',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:6',
    udaCode: '1-03',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: ['CAN-PACK-1C', 'CAN-PACK-1D'],
    title: 'Composizione geometrica e restituzione Open Day',
  },
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PACK-1B fornisce la composizione geometrica; CAN-PACK-1C fornisce la traccia di pitch. CAN-PACK-1D resta nel binding perché il Piano lo prevede come sola regia logistica, ma non genera passaggi, obiettivi, evidenze o risorse della lezione.',
  },
  steps: [
    { packCode: 'CAN-PACK-1B', source: { mode: 'ACTIVITY_CLAUSE', heading: '7. LEZIONE 10 — FIGURA GEOMETRICA COME PROGETTO (2 h)', clauseIndex: 1 } },
    { packCode: 'CAN-PACK-1B', source: { mode: 'ACTIVITY_CLAUSE', heading: '7. LEZIONE 10 — FIGURA GEOMETRICA COME PROGETTO (2 h)', clauseIndex: 2 } },
    { packCode: 'CAN-PACK-1C', source: { mode: 'HEADING', heading: 'FASE 11 — PITCH OPEN DAY', endHeading: 'KIT OPEN DAY OBBLIGATORIO' } },
  ],
  resources: [
    { id: 'OPEN-DAY-PITCH', packCode: 'CAN-PACK-1C', heading: 'FASE 11 — PITCH OPEN DAY', endHeading: 'KIT OPEN DAY OBBLIGATORIO', kind: 'TASK_BRIEF', surfaces: ['PREPARE'], attachToStep: 3, promptMode: 'NUMBERED' },
  ],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [2, 4, 5],
  },
  evidence: [
    { mode: 'PACK_FIELD', packCode: 'CAN-PACK-1B', heading: '7. LEZIONE 10 — FIGURA GEOMETRICA COME PROGETTO (2 h)', field: 'product' },
    { mode: 'RESOURCE_TITLES', resourceIds: ['OPEN-DAY-PITCH'] },
  ],
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [3, 4, 6],
  },
  editorial: {
    why: 'Usare una composizione geometrica controllata come evidenza di comunicazione tecnica e collegarla a una restituzione orale breve del percorso svolto.',
    objective: 'Costruire una composizione geometrica rispettando consegne e misure e preparare un pitch breve che renda comprensibile il processo.',
    assessmentNote: 'Formativa: osserva precisione, leggibilità e capacità di spiegare il percorso con lessico tecnico. Lo stato Open Day resta una classificazione espositiva e non diventa automaticamente un voto.',
    continuation: 'Dopo il gate del primo periodo il percorso di disegno tecnico riprende con segmenti, angoli, assi e bisettrici.',
  },
}

export const B11_B15_RECIPE_PROPOSALS = [
  B11_PRIMA_RECIPE_PROPOSAL,
  B12_PRIMA_RECIPE_PROPOSAL,
  B13_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL,
  B14_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL,
  B15_PRIMA_PACK_COMPOSED_RECIPE_PROPOSAL,
] as const
