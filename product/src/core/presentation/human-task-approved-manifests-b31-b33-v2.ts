import type { HumanTaskEvidenceProvenance } from '@/core/application/human-task-evidence-source-binding'
import type {
  ApprovedHumanTaskCognitiveReceipt,
  ApprovedHumanTaskManifest,
  ApprovedHumanTaskSourceBinding,
} from './human-task-approved-manifest'
import {
  B31_PROJECTION as B31_V1,
  B32_PROJECTION as B32_V1,
  B33_PROJECTION as B33_V1,
} from './human-task-approved-manifests-b31-b33'

const PROVENANCE_SOURCES = B31_V1.sources

export const B31_PROJECTION_V2 = {
  ...B31_V1,
  evidence: 'scheda del problema · requisiti e vincoli · schizzi delle alternative',
  sources: PROVENANCE_SOURCES,
  sourceAlignment: {
    level: 'COMPOSED' as const,
    note: 'CAN-PLAN-1 assegna struttura, titolo e durata. Le fasi 1-2 della UDA 1-07 (CAN-UDA-1-07) definiscono l’azione e le voci 1-3 di PRODOTTO ATTESO sostengono deterministicamente l’evidenza. CAN-PACK-1D resta una provenienza strutturale esplicitamente etichettata e non autorità didattica.',
  },
}

export const B32_PROJECTION_V2 = {
  ...B32_V1,
  evidence: 'scelta motivata · rappresentazione grafica della soluzione · elenco materiali e strumenti · sequenza delle fasi · eventuale modello/prototipo',
  sources: PROVENANCE_SOURCES,
  sourceAlignment: {
    level: 'COMPOSED' as const,
    note: 'CAN-PLAN-1 assegna struttura, titolo e durata. Le fasi 3-4 della UDA 1-07 (CAN-UDA-1-07) definiscono l’azione e le voci 4-8 di PRODOTTO ATTESO sostengono deterministicamente l’evidenza. CAN-PACK-1D resta una provenienza strutturale esplicitamente etichettata e non autorità didattica.',
  },
}

export const B33_PROJECTION_V2 = {
  ...B33_V1,
  evidence: 'Controllo del risultato rispetto ai requisiti iniziali; rilevazione di criticità; proposta di almeno un miglioramento tecnico o ambientale. Presentazione del progetto, restituzione individuale, autovalutazione e verifica finale.',
  sources: PROVENANCE_SOURCES,
  sourceAlignment: {
    level: 'COMPOSED' as const,
    note: 'CAN-PLAN-1 assegna struttura, titolo e durata. Le sole fasi 5-6 della UDA 1-07 (CAN-UDA-1-07) sostengono deterministicamente verifica, miglioramento, presentazione e autovalutazione. CAN-PACK-1D resta una provenienza strutturale esplicitamente etichettata e non autorità didattica.',
  },
}

export const B31_B33_EVIDENCE_PROVENANCE_V2 = {
  B31: {
    sourceRole: 'UDA',
    sourceCode: 'CAN-UDA-1-07',
    rationale: 'Il prodotto atteso UDA documenta direttamente gli artefatti del primo blocco.',
    binding: { kind: 'UDA_SECTION_ITEMS', sectionHeading: 'PRODOTTO ATTESO', itemIndexes: [1, 2, 3] },
  },
  B32: {
    sourceRole: 'UDA',
    sourceCode: 'CAN-UDA-1-07',
    rationale: 'Il prodotto atteso UDA documenta direttamente gli artefatti del secondo blocco.',
    binding: { kind: 'UDA_SECTION_ITEMS', sectionHeading: 'PRODOTTO ATTESO', itemIndexes: [4, 5, 6, 7, 8] },
  },
  B33: {
    sourceRole: 'UDA',
    sourceCode: 'CAN-UDA-1-07',
    rationale: 'Le fasi 5-6 documentano direttamente verifica, miglioramento, presentazione e autovalutazione.',
    binding: { kind: 'UDA_PHASES', phaseOrdinals: [5, 6] },
  },
} satisfies Record<'B31' | 'B32' | 'B33', HumanTaskEvidenceProvenance>

const SOURCE_BINDINGS: ApprovedHumanTaskSourceBinding[] = [
  {
    code: 'CAN-PLAN-1', role: 'PLAN', contribution: 'DIDACTIC',
    assetId: '4a027986-5b6d-49db-9b52-01cfae679c08', generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
    sourceRevision: 'AIroW36pbUMbMlUcOeMxi9OCzPfdnUEUcdx2qF4yPJDZZ6ChzDjwtP-kCQPdkXadhwPRoLyU3X3cT2R4mHJCyWcslKA0uY8qPRGcj83FIU4',
  },
  {
    code: 'CAN-UDA-1-07', role: 'UDA', contribution: 'DIDACTIC',
    assetId: '100a1d2e-d7e8-456e-aa20-30fd6a5ade87', generationId: '92194b46-b7e5-4c52-82a7-b1d75403b8b1',
    sourceRevision: 'AIroW35hwiOFIWinOHHKsGqnTx8mso_Kr_mKKa3VxjlFnZlK4K8Qp_m8BuooTd7TIGmvq7nepjaRZARIHJLqT2MzidhrUrkYU5lF6dHsHTs',
  },
  {
    code: 'CAN-PACK-1D', role: 'PACK', contribution: 'STRUCTURAL',
    assetId: '06594b8f-16e0-4afe-825f-f2618055bc84', generationId: '1d150f77-6a7f-4f8b-8e85-2fa370956e29',
    sourceRevision: 'AIroW34leTeJgZ1YyOGEW15Ht4Qw0hvR-GFWVUH0KkwOobNCD0EatP22ToJMYxWkTyVnXuefZxQzKEOmJrHzMsRBJBGoefOUmFdjRv1-xrY',
  },
]

const COGNITIVE_RECEIPT: ApprovedHumanTaskCognitiveReceipt = {
  status: 'SATISFIED',
  stakeholders: [
    { stakeholder: 'TEACHER', evidence: ['Contesto, obiettivo, sequenza, evidenza, osservazione e continuazione sono espliciti.'], note: 'Il docente può agire senza decodificare documenti canonici lunghi.' },
    { stakeholder: 'LEARNER', evidence: ['Obiettivo, azioni, prodotto/evidenza e criteri sono espliciti; B33 chiude con verifica, miglioramento e autovalutazione.'], note: 'L’alunno può comprendere il compito e autoregolare il lavoro.' },
    { stakeholder: 'COORDINATION', evidence: ['Piano e UDA hanno ruoli distinti; l’evidenza è legata a frammenti UDA specifici.'], note: 'Il raccordo è professionalmente verificabile.' },
    { stakeholder: 'GOVERNANCE', evidence: ['Decisione umana, motivazione, versioni delle fonti e miglioramento sono tracciati.'], note: 'La responsabilità resta umana e auditabile.' },
    { stakeholder: 'SYSTEM', evidence: ['PACK 1D è STRUCTURAL; le evidenze UDA usano binding deterministici.'], note: 'Il sistema non confonde provenienza strutturale e autorità didattica.' },
  ],
  note: 'Adempimento cognitivo verificato per tutti gli stakeholder di contesto della tranche B31-B33.',
}

const APPROVAL = {
  decision: 'APPROVE' as const,
  approvedAt: '2026-08-23T10:55:00+02:00',
  reviewPackageId: 'HTC-REVIEW-PACKAGE:Prima:Prima:11:B31-B33:v2',
  improvementDisposition: 'SYSTEM_IMPROVEMENT_APPLIED' as const,
  improvementNote: 'Aggiunto LEARNER al gate; evidenza vincolata a frammenti UDA; PACK 1D mantenuto come provenienza strutturale esplicitamente tipizzata nel manifest.',
  cognitiveFulfillment: COGNITIVE_RECEIPT,
}

function manifest(projection: typeof B31_PROJECTION_V2 | typeof B32_PROJECTION_V2 | typeof B33_PROJECTION_V2): ApprovedHumanTaskManifest {
  return {
    schemaVersion: 2,
    recipeFamily: 'PLAN_GUIDED_UDA',
    timingSpecificity: 'UNSPECIFIED',
    structuralBinding: {
      grade: projection.grade,
      blockId: projection.blockId,
      udaCode: projection.udaCode,
      packCode: projection.packCode,
      supportPackCodes: [],
      period: projection.period,
      title: projection.title,
    },
    sourceBindings: SOURCE_BINDINGS.map((source) => ({ ...source })),
    projection,
    approval: {
      ...APPROVAL,
      cognitiveFulfillment: {
        ...COGNITIVE_RECEIPT,
        stakeholders: COGNITIVE_RECEIPT.stakeholders.map((item) => ({ ...item, evidence: [...item.evidence] })),
      },
    },
  }
}

export const APPROVED_HUMAN_TASK_MANIFESTS_B31_B33_V2: readonly ApprovedHumanTaskManifest[] = [
  manifest(B31_PROJECTION_V2),
  manifest(B32_PROJECTION_V2),
  manifest(B33_PROJECTION_V2),
]
