import type { HumanTaskContentSource, HumanTaskLessonProjection } from './human-task-content'
import type { ApprovedHumanTaskManifest, ApprovedHumanTaskSourceBinding } from './human-task-approved-manifest'

const PLAN_PRIMA: HumanTaskContentSource = {
  code: 'CAN-PLAN-1',
  label: 'Piano annuale operativo Tecnologia — classe prima',
  role: 'PLAN',
  url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
}

const UDA_107: HumanTaskContentSource = {
  code: 'CAN-UDA-1-07',
  label: 'Progetto tecnologico sostenibile',
  role: 'UDA',
  url: 'https://docs.google.com/document/d/198rM-mGLu0wLzeI0WKIehiWixB38qDbHKeUdXigWqSk/edit',
}

const SOURCE_BINDINGS: ApprovedHumanTaskSourceBinding[] = [
  {
    code: 'CAN-PLAN-1',
    role: 'PLAN',
    contribution: 'DIDACTIC',
    assetId: '4a027986-5b6d-49db-9b52-01cfae679c08',
    generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
  },
  {
    code: 'CAN-UDA-1-07',
    role: 'UDA',
    contribution: 'DIDACTIC',
    assetId: '100a1d2e-d7e8-456e-aa20-30fd6a5ade87',
    generationId: '92194b46-b7e5-4c52-82a7-b1d75403b8b1',
  },
  {
    code: 'CAN-PACK-1D',
    role: 'PACK',
    contribution: 'STRUCTURAL',
    assetId: '06594b8f-16e0-4afe-825f-f2618055bc84',
    generationId: '1d150f77-6a7f-4f8b-8e85-2fa370956e29',
  },
]

const COGNITIVE_FULFILLMENT = {
  policyVersion: 1 as const,
  status: 'SATISFIED' as const,
  stakeholders: [
    {
      stakeholder: 'TEACHER_OPERATOR' as const,
      evidence: [
        'B31–B33 espongono collocazione, obiettivo, sequenza operativa, evidenza, criteri osservabili, nota valutativa e continuazione.',
        'La provenienza distingue Piano, UDA e PACK strutturale e rende visibile dove resta necessaria la decisione professionale.',
      ],
      note: 'Il docente può orientarsi, agire, osservare e registrare senza ricostruire il raccordo tra documenti canonici.',
    },
    {
      stakeholder: 'LEARNER' as const,
      evidence: [
        'Ogni blocco rende espliciti problema/obiettivo, azioni concrete, prodotto o evidenza attesa e criteri osservabili.',
        'B33 chiude il ciclo con verifica rispetto ai requisiti, miglioramento, presentazione e autovalutazione.',
      ],
      note: 'L’alunno può capire cosa fare, cosa rendere osservabile e come controllare o migliorare il proprio lavoro.',
    },
    {
      stakeholder: 'PROFESSIONAL_REVIEWER' as const,
      evidence: [
        'Piano CAN-PLAN-1 d327355b-76a9-496f-99cb-dc942fd950e4 e UDA CAN-UDA-1-07 92194b46-b7e5-4c52-82a7-b1d75403b8b1 sono vincolati esplicitamente.',
        'CAN-PACK-1D 1d150f77-6a7f-4f8b-8e85-2fa370956e29 è conservato come legame STRUCTURAL e non esposto come fonte didattica dei tre blocchi.',
      ],
      note: 'Il revisore può distinguere fonte, derivazione, approvazione umana e confine tra dato didattico e legame strutturale.',
    },
    {
      stakeholder: 'ASSISTED_AUTOMATION' as const,
      evidence: [
        'Le evidenze B31–B32 sono derivate da voci canoniche di PRODOTTO ATTESO; B33 dalle sole fasi operative 5–6 autorizzate.',
        'La promozione resta subordinata a HUMAN_APPROVAL_REQUIRED, revisione di miglioramento conclusa e gate cognitivo SATISFIED.',
      ],
      note: 'L’automazione conosce ciò che può derivare deterministicamente, ciò che non può inventare e il punto in cui deve fermarsi per la decisione umana.',
    },
  ],
  note: 'Adempimento cognitivo verificato per tutti gli stakeholder di contesto prima della promozione B31–B33.',
}

const APPROVAL = {
  decision: 'APPROVE' as const,
  approvedAt: '2026-08-23T10:55:00+02:00',
  reviewPackageId: 'HTC-REVIEW-PACKAGE:Prima:Prima:11:B31-B33:v2',
  improvementDisposition: 'SYSTEM_IMPROVEMENT_APPLIED' as const,
  improvementNote: 'Il ciclo ha generalizzato la provenienza dell’evidenza UDA con estrazione deterministica dalla fonte e ha reso obbligatorio un gate cognitivo multi-stakeholder prima della promozione.',
  cognitiveFulfillment: COGNITIVE_FULFILLMENT,
}

const COMMON_SOURCES = [PLAN_PRIMA, UDA_107]

const B31_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B31-PLAN-v1',
  grade: 'Prima',
  blockId: 'B31',
  udaCode: '1-07',
  udaTitle: 'Progetto tecnologico sostenibile',
  packCode: 'CAN-PACK-1D',
  period: 'Maggio/Giugno',
  title: 'Problema finale e criteri di sostenibilità',
  durationMinutes: 120,
  why: 'Aprire il progetto conclusivo definendo un problema reale e criteri che rendano confrontabili soluzioni diverse, compresa la sostenibilità.',
  objective: 'Individuare destinatari, funzione, requisiti e vincoli, generare più ipotesi e confrontarle con criteri espliciti di utilità, semplicità e uso responsabile delle risorse.',
  outcomes: [
    'riconoscere vincoli e opportunità presenti in una situazione problematica;',
    'formulare semplici criteri di qualità della soluzione;',
    'produrre schizzi e rappresentazioni essenziali;',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Problema e requisiti',
      instruction: 'Presentazione di un problema concreto riferito alla vita scolastica o quotidiana. Individuazione di destinatari, funzione, requisiti, vincoli e criteri di sostenibilità.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Idee e confronto',
      instruction: 'Produzione di più ipotesi, schizzi rapidi e confronto mediante criteri quali utilità, semplicità, quantità di materiale, possibilità di riuso, durata e facilità di realizzazione.',
    },
  ],
  resources: [],
  evidence: 'scheda del problema · requisiti e vincoli · schizzi delle alternative',
  observation: [
    'identifica correttamente il problema e la funzione della soluzione;',
    'considera requisiti e vincoli;',
    'propone e confronta alternative;',
    'utilizza dati o criteri per motivare decisioni;',
  ],
  assessmentNote: 'Formativa: osserva chiarezza del problema, pertinenza di requisiti e vincoli, presenza di alternative e uso comprensibile dei criteri. L’evidenza resta parte del dossier progettuale e non produce automaticamente un voto.',
  continuation: 'Il blocco successivo sceglie la soluzione, la rappresenta, pianifica materiali e fasi e realizza un modello o una simulazione documentata.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 colloca B31 nella UDA conclusiva 1-07. Le fasi 1 e 2 di CAN-UDA-1-07 definiscono l’azione; l’evidenza è derivata deterministicamente dalle voci 1–3 di “PRODOTTO ATTESO”. CAN-PACK-1D resta un legame strutturale e non contribuisce al contenuto didattico del blocco.',
  },
  sources: COMMON_SOURCES,
}

const B32_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B32-PLAN-v1',
  grade: 'Prima',
  blockId: 'B32',
  udaCode: '1-07',
  udaTitle: 'Progetto tecnologico sostenibile',
  packCode: 'CAN-PACK-1D',
  period: 'Maggio/Giugno',
  title: 'Progetto e modello',
  durationMinutes: 120,
  why: 'Trasformare la scelta in una soluzione rappresentabile, realizzabile e controllabile, senza separare disegno, materiali e pianificazione.',
  objective: 'Motivare la soluzione scelta, rappresentarla con dimensioni essenziali, predisporre materiali, strumenti e sequenza operativa e realizzare un modello semplice o una simulazione documentata.',
  outcomes: [
    'produrre schizzi e rappresentazioni essenziali;',
    'selezionare materiali privilegiando, quando possibile, riduzione degli sprechi, riuso, riciclabilità e durata;',
    'organizzare le fasi operative secondo una sequenza logica;',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Progetto della soluzione',
      instruction: 'Scelta motivata dell’ipotesi; rappresentazione grafica; definizione di dimensioni essenziali; elenco di materiali, strumenti e fasi operative.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Modello/prototipo o simulazione',
      instruction: 'Realizzazione guidata di un modello semplice, oppure simulazione documentata quando tempi, sicurezza o materiali non consentano la costruzione fisica.',
    },
  ],
  resources: [],
  evidence: 'scelta motivata · rappresentazione grafica della soluzione · elenco materiali e strumenti · sequenza delle fasi · eventuale modello/prototipo',
  observation: [
    'sceglie materiali coerenti;',
    'rappresenta il progetto con chiarezza adeguata al livello;',
    'organizza una sequenza operativa plausibile;',
  ],
  assessmentNote: 'Formativa: osserva coerenza della scelta, chiarezza della rappresentazione, adeguatezza di materiali e sequenza e corrispondenza tra progetto e modello/simulazione. La qualità estetica non sostituisce la qualità del processo.',
  continuation: 'Il blocco conclusivo verifica il risultato rispetto ai requisiti, propone miglioramenti, valuta la sostenibilità e comunica il percorso con autovalutazione finale.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 colloca B32 nella UDA 1-07 e ne indica progetto e modello. Le fasi 3 e 4 di CAN-UDA-1-07 definiscono l’azione; l’evidenza è derivata deterministicamente dalle voci 4–8 di “PRODOTTO ATTESO”. CAN-PACK-1D non viene usato come guida operativa.',
  },
  sources: COMMON_SOURCES,
}

const B33_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B33-PLAN-v1',
  grade: 'Prima',
  blockId: 'B33',
  udaCode: '1-07',
  udaTitle: 'Progetto tecnologico sostenibile',
  packCode: 'CAN-PACK-1D',
  period: 'Maggio/Giugno',
  title: 'Verifica, comunicazione e chiusura annuale',
  durationMinutes: 120,
  why: 'Chiudere l’anno usando la verifica come confronto con i requisiti iniziali e la comunicazione come prova di comprensione del processo, non come semplice esposizione del manufatto.',
  objective: 'Verificare il risultato, individuare criticità, formulare almeno un miglioramento tecnico o ambientale, motivare la sostenibilità e presentare il processo con autovalutazione finale.',
  outcomes: [
    'utilizzare dati semplici per motivare una scelta;',
    'riconoscere possibili effetti ambientali della soluzione progettata;',
    'comunicare il progetto con linguaggio tecnico essenziale.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Verifica e miglioramento',
      instruction: 'Controllo del risultato rispetto ai requisiti iniziali; rilevazione di criticità; proposta di almeno un miglioramento tecnico o ambientale.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Comunicazione e valutazione',
      instruction: 'Presentazione del progetto, restituzione individuale, autovalutazione e verifica finale.',
    },
  ],
  resources: [],
  evidence: 'Controllo del risultato rispetto ai requisiti iniziali; rilevazione di criticità; proposta di almeno un miglioramento tecnico o ambientale. Presentazione del progetto, restituzione individuale, autovalutazione e verifica finale.',
  observation: [
    'valuta almeno alcuni aspetti ambientali;',
    'utilizza dati o criteri per motivare decisioni;',
    'comunica in modo comprensibile il processo seguito;',
    'collabora e rispetta materiali, tempi e consegne.',
  ],
  assessmentNote: 'Conclusiva per UDA 1-07: integra dossier/prodotto, processo, verifica rispetto ai requisiti, sostenibilità, chiarezza della comunicazione e autovalutazione. Non premia esclusivamente abilità manuali o qualità estetiche.',
  continuation: 'Le evidenze concluse alimentano relazione finale, programma svolto e progettazione iniziale della classe seconda senza modificare retroattivamente il nucleo canonico dell’UDA.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 chiude l’anno con verifica, comunicazione e autovalutazione. L’evidenza è derivata deterministicamente dalle sole fasi operative 5 e 6 di CAN-UDA-1-07, che esplicitano controllo, criticità, miglioramento, presentazione, restituzione individuale, autovalutazione e verifica finale. CAN-PACK-1D resta soltanto nel binding strutturale.',
  },
  sources: COMMON_SOURCES,
}

function manifest(projection: HumanTaskLessonProjection): ApprovedHumanTaskManifest {
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
        ...APPROVAL.cognitiveFulfillment,
        stakeholders: APPROVAL.cognitiveFulfillment.stakeholders.map((item) => ({
          ...item,
          evidence: [...item.evidence],
        })),
      },
    },
  }
}

export const APPROVED_HUMAN_TASK_MANIFESTS_B31_B33: readonly ApprovedHumanTaskManifest[] = [
  manifest(B31_PROJECTION),
  manifest(B32_PROJECTION),
  manifest(B33_PROJECTION),
]
