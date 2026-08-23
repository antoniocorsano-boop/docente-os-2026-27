import type { HumanTaskLessonProjection } from './human-task-content'

const PLAN_PRIMA: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-PLAN-1',
  label: 'Piano annuale operativo Tecnologia — classe prima',
  role: 'PLAN',
  url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
}

const UDA_105: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-UDA-1-05',
  label: 'Dal problema al progetto',
  role: 'UDA',
  url: 'https://docs.google.com/document/d/1sUxPXa-PKvstVNR0_HMYLTk4D-FdPRNG_3Mur3w4SKE/edit',
}

const B23_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B23-PLAN-v1',
  grade: 'Prima',
  blockId: 'B23',
  udaCode: '1-05',
  udaTitle: 'Dal problema al progetto',
  packCode: 'CAN-PACK-1C',
  period: 'Marzo/Aprile',
  title: 'Dal bisogno al problema',
  durationMinutes: 120,
  why: 'Trasformare un bisogno osservabile in un problema progettuale comprensibile, prima di cercare soluzioni.',
  objective: 'Distinguere bisogno, problema, requisito, vincolo e soluzione e formulare un problema progettuale semplice con destinatario e funzione riconoscibili.',
  outcomes: [
    'distinguere bisogno, problema, requisito, vincolo e soluzione;',
    'formulare in modo semplice un problema progettuale;',
  ],
  preparation: [],
  steps: [{
    id: 'S01',
    minutes: null,
    title: 'Dal bisogno al problema',
    instruction: 'Analisi di situazioni concrete; distinzione tra bisogno, problema, funzione, requisito e vincolo; formulazione del problema progettuale.',
  }],
  resources: [],
  evidence: 'Brief progettuale.',
  observation: [
    'Formula o comprende correttamente il problema.',
    'Individua requisiti e vincoli pertinenti.',
  ],
  assessmentNote: 'Formativa: osserva chiarezza del problema e pertinenza di requisiti e vincoli. Il brief documenta l’avvio del progetto e non genera automaticamente un voto.',
  continuation: 'La lezione successiva raccoglie informazioni utili e produce almeno due alternative progettuali con schizzi preliminari.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B23 coincide esattamente con la Fase 1 da 2 ore di UDA 1-05. CAN-PACK-1C resta il repertorio metodologico del segmento ma non determina la scansione temporale della lezione.',
  },
  sources: [PLAN_PRIMA, UDA_105],
}

const B24_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B24-PLAN-v1',
  grade: 'Prima',
  blockId: 'B24',
  udaCode: '1-05',
  udaTitle: 'Dal problema al progetto',
  packCode: 'CAN-PACK-1C',
  period: 'Marzo/Aprile',
  title: 'Informazioni e alternative',
  durationMinutes: 120,
  why: 'Evitare la prima idea disponibile e fondare l’ideazione su informazioni pertinenti e alternative confrontabili.',
  objective: 'Raccogliere dati utili, produrre almeno due ipotesi progettuali e rappresentarle con schizzi preliminari comprensibili.',
  outcomes: [
    'raccogliere dati e informazioni utili prima di proporre una soluzione;',
    'produrre almeno due ipotesi progettuali;',
  ],
  preparation: [],
  steps: [{
    id: 'S01',
    minutes: null,
    title: 'Cercare informazioni e generare idee',
    instruction: 'Osservazione di esempi, raccolta di dati utili, produzione guidata di alternative, schizzi preliminari.',
  }],
  resources: [],
  evidence: 'Dossier alternative.',
  observation: ['Produce più di una ipotesi.'],
  assessmentNote: 'Formativa: osserva pertinenza delle informazioni, presenza di più alternative e chiarezza degli schizzi. Il dossier delle alternative resta evidenza di processo.',
  continuation: 'La lezione successiva definisce criteri espliciti, confronta le alternative e porta a una scelta motivata.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B24 coincide esattamente con la Fase 2 da 2 ore di UDA 1-05. Il repertorio Open Day non sostituisce la sequenza formale della UDA.',
  },
  sources: [PLAN_PRIMA, UDA_105],
}

const B25_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B25-PLAN-v1',
  grade: 'Prima',
  blockId: 'B25',
  udaCode: '1-05',
  udaTitle: 'Dal problema al progetto',
  packCode: 'CAN-PACK-1C',
  period: 'Marzo/Aprile',
  title: 'Confrontare e scegliere',
  durationMinutes: 120,
  why: 'Rendere la scelta progettuale verificabile e argomentata, invece di trattarla come preferenza personale.',
  objective: 'Confrontare le alternative con criteri espliciti di funzionalità, fattibilità, materiali, sicurezza, costo indicativo e riduzione degli sprechi e motivare la scelta finale.',
  outcomes: ['confrontare alternative con una semplice matrice di criteri;'],
  preparation: [],
  steps: [{
    id: 'S01',
    minutes: null,
    title: 'Confrontare e scegliere',
    instruction: 'Definizione di criteri semplici: funzionalità, fattibilità, materiali, sicurezza, costo indicativo, riduzione degli sprechi. Confronto delle alternative e scelta motivata.',
  }],
  resources: [],
  evidence: 'Matrice di scelta motivata.',
  observation: ['Confronta alternative usando criteri espliciti.'],
  assessmentNote: 'Formativa: osserva uso coerente dei criteri e capacità di motivare la decisione. La matrice rende trasparente il ragionamento ma non produce automaticamente un voto numerico.',
  continuation: 'La soluzione scelta viene poi rappresentata e trasformata in un piano di lavoro con misure, materiali, strumenti e ordine delle operazioni.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B25 coincide esattamente con la Fase 3 da 2 ore di UDA 1-05. Non vengono aggiunti pesi o punteggi non dichiarati dalle fonti.',
  },
  sources: [PLAN_PRIMA, UDA_105],
}

const B26_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B26-PLAN-v1',
  grade: 'Prima',
  blockId: 'B26',
  udaCode: '1-05',
  udaTitle: 'Dal problema al progetto',
  packCode: 'CAN-PACK-1C',
  period: 'Marzo/Aprile',
  title: 'Rappresentare e pianificare',
  durationMinutes: 120,
  why: 'Passare da un’idea scelta a istruzioni abbastanza chiare da poter essere realizzate e controllate.',
  objective: 'Rappresentare la soluzione con misure essenziali, individuare materiali e strumenti e predisporre una sequenza operativa sicura e comprensibile.',
  outcomes: [
    'rappresentare la soluzione scelta mediante schizzo, disegno quotato o schema;',
    'predisporre una sequenza operativa essenziale;',
    'individuare materiali e strumenti adatti;',
  ],
  preparation: [],
  steps: [{
    id: 'S01',
    minutes: null,
    title: 'Rappresentare e pianificare',
    instruction: 'Disegno della soluzione, indicazione delle misure essenziali, materiali, strumenti e ordine delle operazioni.',
  }],
  resources: [],
  evidence: 'Tavola progettuale + piano di lavoro.',
  observation: [
    'Rappresenta in modo comprensibile la soluzione.',
    'Sceglie materiali e strumenti coerenti.',
    'Rispetta la sequenza operativa e le regole di sicurezza.',
  ],
  assessmentNote: 'Formativa: osserva leggibilità della rappresentazione, coerenza di materiali e strumenti e completezza della sequenza operativa. Tavola e piano di lavoro restano due evidenze dello stesso processo.',
  continuation: 'La lezione successiva realizza o simula il modello, lo prova rispetto ai requisiti e documenta correzioni e miglioramenti.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B26 coincide esattamente con la Fase 4 da 2 ore di UDA 1-05. Il monte ore orientativo del micro-progetto Open Day non viene trasferito nella UDA formale.',
  },
  sources: [PLAN_PRIMA, UDA_105],
}

const B27_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B27-PLAN-v1',
  grade: 'Prima',
  blockId: 'B27',
  udaCode: '1-05',
  udaTitle: 'Dal problema al progetto',
  packCode: 'CAN-PACK-1C',
  period: 'Marzo/Aprile',
  title: 'Realizzare, verificare, migliorare',
  durationMinutes: 120,
  why: 'Chiudere il processo progettuale usando la prova come confronto con i requisiti iniziali e il miglioramento come conseguenza delle evidenze raccolte.',
  objective: 'Realizzare o simulare un modello, verificarlo rispetto ai requisiti, individuare difetti o correzioni e presentare sinteticamente il percorso seguito.',
  outcomes: [
    'realizzare, quando possibile, un modello fisico o simulato;',
    'verificare la rispondenza del risultato ai requisiti iniziali;',
    'motivare eventuali correzioni o miglioramenti.',
  ],
  preparation: [],
  steps: [{
    id: 'S01',
    minutes: null,
    title: 'Realizzare, verificare, migliorare',
    instruction: 'Costruzione o simulazione del modello; prova rispetto ai requisiti; individuazione di difetti, correzioni e possibili miglioramenti; breve presentazione del lavoro.',
  }],
  resources: [],
  evidence: 'Dossier completo + presentazione.',
  observation: [
    'Rispetta la sequenza operativa e le regole di sicurezza.',
    'Verifica il risultato rispetto ai requisiti.',
    'Motiva almeno una scelta e un possibile miglioramento.',
  ],
  assessmentNote: 'Conclusiva per UDA 1-05: integra dossier progettuale, qualità della soluzione, prova rispetto ai requisiti e capacità di spiegare il processo. La proposta di miglioramento è parte dell’evidenza e non va confusa con una penalizzazione automatica del primo prototipo.',
  continuation: 'Con UDA 1-05 chiusa, il Piano passa a informazioni, dati e sistemi digitali.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'B27 coincide esattamente con la Fase 5 da 2 ore di UDA 1-05. Il repertorio PACK resta secondario finché non contribuisce con risorse estratte in modo affidabile.',
  },
  sources: [PLAN_PRIMA, UDA_105],
}

export const APPROVED_HUMAN_TASK_PROJECTIONS_B23_B27: readonly HumanTaskLessonProjection[] = [
  B23_PRIMA,
  B24_PRIMA,
  B25_PRIMA,
  B26_PRIMA,
  B27_PRIMA,
]
