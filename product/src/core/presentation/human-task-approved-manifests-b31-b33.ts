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

const PACK_1D: HumanTaskContentSource = {
  code: 'CAN-PACK-1D',
  label: 'Pacchetto di allestimento e conduzione Open Day — collegamento strutturale del Piano',
  role: 'PACK',
  url: 'https://docs.google.com/document/d/1vCgBmugg-NlH9CEA7jw1BT4CconZFDKxC9rXjjZvHqU/edit',
}

const SOURCE_BINDINGS: ApprovedHumanTaskSourceBinding[] = [
  {
    code: 'CAN-PLAN-1',
    role: 'PLAN',
    assetId: '4a027986-5b6d-49db-9b52-01cfae679c08',
    generationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
    sourceRevision: 'AIroW36pbUMbMlUcOeMxi9OCzPfdnUEUcdx2qF4yPJDZZ6ChzDjwtP-kCQPdkXadhwPRoLyU3X3cT2R4mHJCyWcslKA0uY8qPRGcj83FIU4',
  },
  {
    code: 'CAN-UDA-1-07',
    role: 'UDA',
    assetId: '100a1d2e-d7e8-456e-aa20-30fd6a5ade87',
    generationId: '92194b46-b7e5-4c52-82a7-b1d75403b8b1',
    sourceRevision: 'AIroW35hwiOFIWinOHHKsGqnTx8mso_Kr_mKKa3VxjlFnZlK4K8Qp_m8BuooTd7TIGmvq7nepjaRZARIHJLqT2MzidhrUrkYU5lF6dHsHTs',
  },
  {
    code: 'CAN-PACK-1D',
    role: 'PACK',
    assetId: '06594b8f-16e0-4afe-825f-f2618055bc84',
    generationId: '1d150f77-6a7f-4f8b-8e85-2fa370956e29',
    sourceRevision: 'AIroW34leTeJgZ1YyOGEW15Ht4Qw0hvR-GFWVUH0KkwOobNCD0EatP22ToJMYxWkTyVnXuefZxQzKEOmJrHzMsRBJBGoefOUmFdjRv1-xrY',
  },
]

const APPROVAL = {
  decision: 'APPROVE' as const,
  approvedAt: '2026-08-23T10:40:00+02:00',
  reviewPackageId: 'HTC-REVIEW-PACKAGE:Prima:Prima:11:B31-B33:v1',
  improvementDisposition: 'SYSTEM_IMPROVEMENT_APPLIED' as const,
  improvementNote: 'Approvazione condizionata al gate cognitivo multi-stakeholder: il Piano governa struttura e collocazione; UDA 1-07 sostiene evidenze, osservazione e valutazione; PACK 1D resta collegamento strutturale/logistico e non sostituisce la fonte didattica. La promozione è ammessa solo se docente, coordinamento, governance e sistema superano il gate di comprensione e tracciabilità.',
}

const COMMON_SOURCES = [PLAN_PRIMA, UDA_107, PACK_1D]

export const B31_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B31-PLAN-v1',
  grade: 'Prima',
  blockId: 'B31',
  udaCode: '1-07',
  udaTitle: 'Progetto tecnologico sostenibile',
  packCode: 'CAN-PACK-1D',
  period: 'Maggio/Giugno',
  title: 'Problema finale e criteri di sostenibilità',
  durationMinutes: 120,
  why: 'Avviare il progetto conclusivo trasformando un problema reale o verosimile in requisiti, vincoli e alternative confrontabili con criteri tecnici e di sostenibilità.',
  objective: 'Definire problema, destinatari, funzione, requisiti e vincoli; produrre più ipotesi e confrontarle con criteri espliciti di utilità, semplicità, uso dei materiali, riuso, durata e fattibilità.',
  outcomes: [
    'Riconoscere vincoli e opportunità presenti in una situazione problematica.',
    'Formulare semplici criteri di qualità della soluzione.',
    'Produrre schizzi e rappresentazioni essenziali.',
    'Utilizzare dati semplici per motivare una scelta.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Problema e requisiti',
      instruction: 'Presenta o individua con la classe un problema concreto riferito alla vita scolastica o quotidiana. Definite destinatari, funzione, requisiti, vincoli e criteri di sostenibilità.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Idee e confronto',
      instruction: 'Gli alunni producono più ipotesi e schizzi rapidi e le confrontano con criteri espliciti quali utilità, semplicità, quantità di materiale, possibilità di riuso, durata e facilità di realizzazione.',
    },
  ],
  resources: [],
  evidence: 'Scheda del problema con requisiti e vincoli + schizzi delle alternative e confronto motivato.',
  observation: [
    'Identifica correttamente il problema e la funzione della soluzione.',
    'Considera requisiti e vincoli.',
    'Propone e confronta alternative.',
    'Utilizza dati o criteri per motivare decisioni.',
  ],
  assessmentNote: 'Formativa: osserva qualità della definizione del problema, pertinenza di requisiti e vincoli e capacità di produrre e confrontare alternative. Le evidenze provengono dal prodotto atteso e dalle evidenze osservabili di UDA 1-07; non generano automaticamente un voto.',
  continuation: 'La lezione successiva porta alla scelta motivata, alla rappresentazione della soluzione e alla costruzione o simulazione del modello.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 assegna B31-B33 a UDA 1-07 e definisce titoli, ordine e durata. UDA 1-07 fornisce la sequenza operativa e l’evidenza attesa. CAN-PACK-1D resta un collegamento strutturale/logistico del Piano e non determina contenuti, tempi o valutazione di B31.',
  },
  sources: COMMON_SOURCES,
}

export const B32_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B32-PLAN-v1',
  grade: 'Prima',
  blockId: 'B32',
  udaCode: '1-07',
  udaTitle: 'Progetto tecnologico sostenibile',
  packCode: 'CAN-PACK-1D',
  period: 'Maggio/Giugno',
  title: 'Progetto e modello',
  durationMinutes: 120,
  why: 'Trasformare la scelta progettuale in una soluzione rappresentata, pianificata e verificabile attraverso un modello, un prototipo semplice o una simulazione documentata.',
  objective: 'Scegliere e motivare una soluzione, rappresentarla graficamente, definire dimensioni essenziali, materiali, strumenti e fasi operative e realizzare o simulare un modello coerente con i vincoli.',
  outcomes: [
    'Produrre schizzi e rappresentazioni essenziali.',
    'Selezionare materiali privilegiando, quando possibile, riduzione degli sprechi, riuso, riciclabilità e durata.',
    'Organizzare le fasi operative secondo una sequenza logica.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Progetto della soluzione',
      instruction: 'Gli alunni scelgono motivatamente l’ipotesi, preparano la rappresentazione grafica, definiscono dimensioni essenziali e organizzano materiali, strumenti e fasi operative.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Modello, prototipo o simulazione',
      instruction: 'Realizzano in modo guidato un modello semplice oppure una simulazione documentata quando tempi, sicurezza o materiali non consentono la costruzione fisica.',
    },
  ],
  resources: [],
  evidence: 'Scelta motivata + rappresentazione grafica + materiali/strumenti e sequenza operativa + modello, prototipo o simulazione documentata.',
  observation: [
    'Sceglie materiali coerenti.',
    'Rappresenta il progetto con chiarezza adeguata al livello.',
    'Organizza una sequenza operativa plausibile.',
    'Valuta almeno alcuni aspetti ambientali.',
  ],
  assessmentNote: 'Formativa: osserva coerenza della scelta, chiarezza della rappresentazione, adeguatezza di materiali e strumenti e plausibilità della sequenza. La qualità estetica o manuale non sostituisce la valutazione del processo.',
  continuation: 'La lezione conclusiva verifica il risultato rispetto ai requisiti, documenta un miglioramento e chiude il percorso con comunicazione e autovalutazione.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 governa la collocazione di B32 nel segmento finale; UDA 1-07 documenta le fasi di progetto e modello e il prodotto atteso. CAN-PACK-1D non viene usato per introdurre una diversa sequenza o un diverso monte ore.',
  },
  sources: COMMON_SOURCES,
}

export const B33_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B33-PLAN-v1',
  grade: 'Prima',
  blockId: 'B33',
  udaCode: '1-07',
  udaTitle: 'Progetto tecnologico sostenibile',
  packCode: 'CAN-PACK-1D',
  period: 'Maggio/Giugno',
  title: 'Verifica, comunicazione e chiusura annuale',
  durationMinutes: 120,
  why: 'Chiudere l’anno facendo usare la verifica come confronto con i requisiti, il miglioramento come risposta alle criticità e la comunicazione come ricostruzione consapevole del processo svolto.',
  objective: 'Verificare il risultato rispetto ai requisiti iniziali, individuare criticità e un miglioramento tecnico o ambientale, presentare il progetto e completare una restituzione individuale e l’autovalutazione finale.',
  outcomes: [
    'Riconoscere possibili effetti ambientali della soluzione progettata.',
    'Utilizzare dati semplici per motivare una scelta.',
    'Comunicare il progetto con linguaggio tecnico essenziale.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Verifica e miglioramento',
      instruction: 'Gli alunni controllano il risultato rispetto ai requisiti iniziali, rilevano criticità e formulano almeno un miglioramento tecnico o ambientale.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Comunicazione e valutazione',
      instruction: 'Presentano il progetto, ricostruiscono il processo seguito, completano la restituzione individuale, l’autovalutazione e la verifica finale.',
    },
  ],
  resources: [],
  evidence: 'Verifica rispetto ai requisiti + proposta di miglioramento + breve valutazione di sostenibilità + presentazione e autovalutazione finale.',
  observation: [
    'Valuta almeno alcuni aspetti ambientali.',
    'Utilizza dati o criteri per motivare decisioni.',
    'Comunica in modo comprensibile il processo seguito.',
    'Collabora e rispetta materiali, tempi e consegne.',
  ],
  assessmentNote: 'Conclusiva per UDA 1-07: integra dossier/prodotto, processo, verifica rispetto ai requisiti, sostenibilità, capacità di motivare le scelte e presentazione. La valutazione non premia esclusivamente qualità estetiche o abilità manuali.',
  continuation: 'L’UDA conclusiva alimenta la relazione finale, il programma svolto e le indicazioni utili per l’avvio della classe seconda; gli scostamenti reali restano registrati per sezione.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 definisce B33 come chiusura annuale di UDA 1-07; UDA 1-07 fornisce verifica, miglioramento, comunicazione, autovalutazione, tracciabilità ed esito di fine anno. CAN-PACK-1D resta distinto dalla valutazione didattica.',
  },
  sources: COMMON_SOURCES,
}

function manifest(projection: HumanTaskLessonProjection): ApprovedHumanTaskManifest {
  return {
    schemaVersion: 1,
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
    approval: { ...APPROVAL },
  }
}

export const APPROVED_HUMAN_TASK_MANIFESTS_B31_B33: readonly ApprovedHumanTaskManifest[] = [
  manifest(B31_PROJECTION),
  manifest(B32_PROJECTION),
  manifest(B33_PROJECTION),
]

export const B31_B33_EVIDENCE_PROVENANCE = {
  B31: {
    sourceRole: 'UDA' as const,
    sourceCode: 'CAN-UDA-1-07',
    rationale: 'Il Piano assegna struttura, titolo e durata del blocco; il prodotto atteso e le evidenze osservabili specifiche sono documentati da UDA 1-07.',
  },
  B32: {
    sourceRole: 'UDA' as const,
    sourceCode: 'CAN-UDA-1-07',
    rationale: 'Il Piano colloca il blocco nel progetto finale; UDA 1-07 documenta rappresentazione, materiali, sequenza e modello/prototipo o simulazione.',
  },
  B33: {
    sourceRole: 'UDA' as const,
    sourceCode: 'CAN-UDA-1-07',
    rationale: 'Il Piano definisce la chiusura annuale; UDA 1-07 documenta verifica, miglioramento, presentazione, autovalutazione e uso delle evidenze nella chiusura dell’anno.',
  },
} as const
