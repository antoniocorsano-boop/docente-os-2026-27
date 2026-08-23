import type { HumanTaskPlanGuidedUdaProjectionRecipe } from './human-task-plan-guided-uda-projection-recipe'
import type { PlanGuidedEvidenceBinding } from './human-task-plan-guided-evidence-source'

const PLAN_SOURCE = {
  code: 'CAN-PLAN-1',
  generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
} as const

const UDA_GENERATION = '92194b46-b7e5-4c52-82a7-b1d75403b8b1'
const PACK_GENERATION = '1d150f77-6a7f-4f8b-8e85-2fa370956e29'

function candidateId(blockId: string) {
  return `HTC-CANDIDATE:Prima:${blockId}:${UDA_GENERATION}:${PACK_GENERATION}`
}

function baseBinding(title: string) {
  return {
    planSourceCode: 'CAN-PLAN-1',
    segmentKey: 'Prima:11',
    udaCode: '1-07',
    packCode: 'CAN-PACK-1D',
    supportPackCodes: [],
    title,
  }
}

const EMPTY_PLAN_FRAGMENT = {
  ...PLAN_SOURCE,
  blockActivity: null,
  blockEvidence: '',
} as const

export const B31_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B31-PLAN-v1',
  candidateId: candidateId('B31'),
  grade: 'Prima',
  blockId: 'B31',
  planBinding: baseBinding('Problema finale e criteri di sostenibilità'),
  planSource: EMPTY_PLAN_FRAGMENT,
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 colloca B31 nella UDA conclusiva 1-07; le fasi 1 e 2 della UDA forniscono la sequenza operativa di problema, requisiti, alternative e confronto. CAN-PACK-1D resta associato al segmento ma non definisce tempi, evidenza o passaggi didattici del blocco.',
  },
  operationalPhaseOrdinals: [1, 2],
  phaseCoverageBlockIds: ['B31'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [1, 2, 3],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [1, 2, 3, 8],
  },
  editorial: {
    why: 'Aprire il progetto conclusivo definendo un problema reale e criteri che rendano confrontabili soluzioni diverse, compresa la sostenibilità.',
    objective: 'Individuare destinatari, funzione, requisiti e vincoli, generare più ipotesi e confrontarle con criteri espliciti di utilità, semplicità e uso responsabile delle risorse.',
    assessmentNote: 'Formativa: osserva chiarezza del problema, pertinenza di requisiti e vincoli, presenza di alternative e uso comprensibile dei criteri. L’evidenza resta parte del dossier progettuale e non produce automaticamente un voto.',
    continuation: 'Il blocco successivo sceglie la soluzione, la rappresenta, pianifica materiali e fasi e realizza un modello o una simulazione documentata.',
  },
}

export const B31_EVIDENCE_BINDING: PlanGuidedEvidenceBinding = {
  source: 'UDA_PHASES',
  phaseOrdinals: [1, 2],
  text: 'Scheda del problema con requisiti e vincoli, schizzi delle alternative e confronto mediante criteri.',
  rationale: 'Le fasi 1 e 2 richiedono problema, destinatari, funzione, requisiti, vincoli, più ipotesi, schizzi e confronto; il prodotto atteso della UDA include scheda del problema, requisiti/vincoli e schizzi delle alternative.',
}

export const B32_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B32-PLAN-v1',
  candidateId: candidateId('B32'),
  grade: 'Prima',
  blockId: 'B32',
  planBinding: baseBinding('Progetto e modello'),
  planSource: EMPTY_PLAN_FRAGMENT,
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 colloca B32 nella UDA 1-07 e ne indica progetto e modello; le fasi 3 e 4 della UDA specificano scelta motivata, rappresentazione, materiali, strumenti, sequenza e modello/prototipo o simulazione. CAN-PACK-1D non viene usato come guida operativa del blocco.',
  },
  operationalPhaseOrdinals: [3, 4],
  phaseCoverageBlockIds: ['B32'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [3, 4, 5],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [4, 5, 6],
  },
  editorial: {
    why: 'Trasformare la scelta in una soluzione rappresentabile, realizzabile e controllabile, senza separare disegno, materiali e pianificazione.',
    objective: 'Motivare la soluzione scelta, rappresentarla con dimensioni essenziali, predisporre materiali, strumenti e sequenza operativa e realizzare un modello semplice o una simulazione documentata.',
    assessmentNote: 'Formativa: osserva coerenza della scelta, chiarezza della rappresentazione, adeguatezza di materiali e sequenza e corrispondenza tra progetto e modello/simulazione. La qualità estetica non sostituisce la qualità del processo.',
    continuation: 'Il blocco conclusivo verifica il risultato rispetto ai requisiti, propone miglioramenti, valuta la sostenibilità e comunica il percorso con autovalutazione finale.',
  },
}

export const B32_EVIDENCE_BINDING: PlanGuidedEvidenceBinding = {
  source: 'UDA_PHASES',
  phaseOrdinals: [3, 4],
  text: 'Scelta motivata, rappresentazione grafica, materiali e strumenti, sequenza operativa ed eventuale modello/prototipo o simulazione documentata.',
  rationale: 'Le fasi 3 e 4 richiedono scelta motivata, rappresentazione, dimensioni, materiali, strumenti, fasi e modello/prototipo o simulazione; gli stessi elementi sono elencati nel prodotto atteso della UDA.',
}

export const B33_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL: HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA',
  recipeId: 'HTC-RECIPE-PRIMA-B33-PLAN-v1',
  candidateId: candidateId('B33'),
  grade: 'Prima',
  blockId: 'B33',
  planBinding: baseBinding('Verifica, comunicazione e chiusura annuale'),
  planSource: EMPTY_PLAN_FRAGMENT,
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 chiude l’anno con verifica, comunicazione e autovalutazione; le fasi 5 e 6 della UDA 1-07 esplicitano controllo rispetto ai requisiti, criticità, miglioramento, presentazione, restituzione individuale, autovalutazione e verifica finale.',
  },
  operationalPhaseOrdinals: [5, 6],
  phaseCoverageBlockIds: ['B33'],
  stepSource: 'UDA_PHASE',
  outcomes: {
    udaSectionHeading: 'OBIETTIVI DI APPRENDIMENTO',
    itemIndexes: [6, 7, 8],
  },
  observation: {
    udaSectionHeading: 'EVIDENZE OSSERVABILI',
    itemIndexes: [7, 8, 9, 10],
  },
  editorial: {
    why: 'Chiudere l’anno usando la verifica come confronto con i requisiti iniziali e la comunicazione come prova di comprensione del processo, non come semplice esposizione del manufatto.',
    objective: 'Verificare il risultato, individuare criticità, formulare almeno un miglioramento tecnico o ambientale, motivare la sostenibilità e presentare il processo con autovalutazione finale.',
    assessmentNote: 'Conclusiva per UDA 1-07: integra dossier/prodotto, processo, verifica rispetto ai requisiti, sostenibilità, chiarezza della comunicazione e autovalutazione. Non premia esclusivamente abilità manuali o qualità estetiche.',
    continuation: 'Le evidenze concluse alimentano relazione finale, programma svolto e progettazione iniziale della classe seconda senza modificare retroattivamente il nucleo canonico dell’UDA.',
  },
}

export const B33_EVIDENCE_BINDING: PlanGuidedEvidenceBinding = {
  source: 'UDA_PHASES',
  phaseOrdinals: [5, 6],
  text: 'Verifica rispetto ai requisiti, criticità e miglioramento proposto, valutazione di sostenibilità, presentazione e autovalutazione finale.',
  rationale: 'Le fasi 5 e 6 richiedono verifica, criticità, miglioramento, presentazione, restituzione individuale e autovalutazione; prodotto atteso e valutazione finale della UDA confermano dossier, sostenibilità e presentazione.',
}

export const B31_B33_RECIPE_PROPOSALS = [
  { recipe: B31_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, evidence: B31_EVIDENCE_BINDING },
  { recipe: B32_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, evidence: B32_EVIDENCE_BINDING },
  { recipe: B33_PRIMA_PLAN_GUIDED_RECIPE_PROPOSAL, evidence: B33_EVIDENCE_BINDING },
] as const
