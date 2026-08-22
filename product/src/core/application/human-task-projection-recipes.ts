import type { HumanTaskProjectionRecipe } from './human-task-projection-recipe'

// Proposal only. The candidateId binds this Recipe to the exact UDA/PACK generations;
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
