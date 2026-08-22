import type { HumanTaskProjectionRecipe } from './human-task-projection-recipe'
import type { HumanTaskProjectionGap } from './human-task-projection-batch'

// Proposal only. The candidateId binds each Recipe to the exact UDA/PACK generations;
// planBinding binds it to the exact canonical block structure verified against CAN-PLAN-1.
// Promotion to the lesson runtime remains a separate human gate.
export const B07_PRIMA_RECIPE_PROPOSAL: HumanTaskProjectionRecipe = {
  recipeId: 'HTC-RECIPE-PRIMA-B07-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B07:5e0d5ae7-9f43-4d55-b470-533f2ac806fe:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B07',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:3',
    udaCode: '1-02',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Riconoscere e classificare i materiali',
  },
  sourceAlignment: { level: 'DIRECT' },
  guide: {
    packCode: 'CAN-PACK-1B',
    heading: '2. LEZIONE 5 — RICONOSCERE E CLASSIFICARE I MATERIALI (2 h)',
  },
  supportingUdaPhaseOrdinals: [1, 2],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [1, 2, 4],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [1, 2, 8],
  },
  resources: [
    {
      id: 'STUDENT-E',
      packCode: 'CAN-PACK-1B',
      heading: 'SCHEDA E — CARTA D’IDENTITÀ DI UN MATERIALE',
      kind: 'STUDENT_SHEET',
      surfaces: ['PREPARE'],
      attachToStep: 3,
    },
  ],
  editorial: {
    why: 'Avviare lo studio dei materiali partendo da campioni reali e distinguendo risorsa, materia prima, materiale, semilavorato e prodotto.',
    objective: 'Riconoscere e classificare materiali di uso comune usando criteri espliciti e un lessico tecnico iniziale.',
    assessmentNote: 'Formativa: osserva correttezza della classificazione, proprietà riconosciute e uso del lessico. La singola scheda non viene trasformata automaticamente in voto.',
    continuation: 'La lezione successiva passa alle proprietà e alle prove comparative.',
  },
}

export const B08_PRIMA_RECIPE_PROPOSAL: HumanTaskProjectionRecipe = {
  recipeId: 'HTC-RECIPE-PRIMA-B08-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B08:5e0d5ae7-9f43-4d55-b470-533f2ac806fe:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B08',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:3',
    udaCode: '1-02',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Proprietà e prove comparative',
  },
  sourceAlignment: { level: 'DIRECT' },
  guide: {
    packCode: 'CAN-PACK-1B',
    heading: '3. LEZIONE 6 — OSSERVARE E PROVARE LE PROPRIETÀ (2 h)',
  },
  supportingUdaPhaseOrdinals: [3],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [3, 5, 9],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [3, 4, 5],
  },
  resources: [
    {
      id: 'STUDENT-F',
      packCode: 'CAN-PACK-1B',
      heading: 'SCHEDA F — PROVA COMPARATIVA',
      kind: 'STUDENT_SHEET',
      surfaces: ['PREPARE'],
      attachToStep: 1,
    },
  ],
  editorial: {
    why: 'Passare dalla semplice osservazione al confronto controllato delle proprietà, distinguendo procedura, dato osservato e conclusione.',
    objective: 'Eseguire semplici prove comparative in condizioni controllate e registrare i risultati senza confondere osservazioni e interpretazioni.',
    assessmentNote: 'Formativa: osserva rispetto della procedura, qualità della registrazione e coerenza fra dato osservato e conclusione. La prova non diventa automaticamente un voto.',
    continuation: 'La lezione successiva usa proprietà e criteri per scegliere un materiale adatto a una funzione.',
  },
}

export const B09_PRIMA_RECIPE_PROPOSAL: HumanTaskProjectionRecipe = {
  recipeId: 'HTC-RECIPE-PRIMA-B09-v1',
  candidateId: 'HTC-CANDIDATE:Prima:B09:5e0d5ae7-9f43-4d55-b470-533f2ac806fe:1902bdd3-c65f-46c0-b419-99bcd45131ad',
  grade: 'Prima',
  blockId: 'B09',
  planBinding: {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:3',
    udaCode: '1-02',
    packCode: 'CAN-PACK-1B',
    supportPackCodes: [],
    title: 'Scegliere un materiale per una funzione',
  },
  sourceAlignment: { level: 'DIRECT' },
  guide: {
    packCode: 'CAN-PACK-1B',
    heading: '4. LEZIONE 7 — SCEGLIERE UN MATERIALE PER UNA FUNZIONE (2 h)',
  },
  supportingUdaPhaseOrdinals: [5],
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [3, 7, 9],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [5, 7, 8],
  },
  resources: [
    {
      id: 'STUDENT-G',
      packCode: 'CAN-PACK-1B',
      heading: 'SCHEDA G — MATRICE DI SCELTA',
      kind: 'STUDENT_SHEET',
      surfaces: ['PREPARE'],
      attachToStep: 2,
    },
  ],
  editorial: {
    why: 'Usare proprietà e vincoli per passare dal confronto alla decisione tecnica, motivando la scelta fra materiali alternativi.',
    objective: 'Confrontare tre materiali con criteri espliciti e motivare una scelta coerente con funzione, proprietà, sicurezza, durata e fine vita.',
    assessmentNote: 'Formativa e prestazionale: osserva soprattutto la coerenza fra criteri, confronto e scelta finale. La matrice sostiene l’argomentazione e non genera automaticamente un voto.',
    continuation: 'Il percorso sui materiali prosegue ricostruendo il passaggio dalla risorsa al prodotto.',
  },
}

export const B10_PRIMA_RECIPE_GAP: HumanTaskProjectionGap = {
  grade: 'Prima',
  blockId: 'B10',
  reason: 'NO_OPERATIONAL_GUIDE',
  note: 'CAN-UDA-1-02 assegna 2 ore alla fase “Dalla risorsa al prodotto”, ma CAN-PACK-1B passa dalla Lezione 7 sui materiali alla Lezione 8 di avvio al disegno tecnico. Non esiste quindi una guida docente 2h direttamente allineata a B10 da promuovere senza una composizione esplicita.',
}
