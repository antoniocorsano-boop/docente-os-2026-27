import type { HumanTaskContentSource, HumanTaskLessonProjection } from './human-task-content'
import type { ApprovedHumanTaskManifest, ApprovedHumanTaskSourceBinding } from './human-task-approved-manifest'

const PLAN_PRIMA: HumanTaskContentSource = {
  code: 'CAN-PLAN-1',
  label: 'Piano annuale operativo Tecnologia — classe prima',
  role: 'PLAN',
  url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
}

const UDA_106: HumanTaskContentSource = {
  code: 'CAN-UDA-1-06',
  label: 'Informazioni, dati e sistemi digitali',
  role: 'UDA',
  url: 'https://docs.google.com/document/d/13CPAh6vhkEVRZBTqo3KcrauvhN7z12Q-BuPW5U9Dark/edit',
}

const PACK_1F: HumanTaskContentSource = {
  code: 'CAN-PACK-1F',
  label: 'Dai dati all’informazione',
  role: 'PACK',
  url: 'https://docs.google.com/document/d/1gLPi07CDxwCgi8Vtozwk2Em0cmSru5_vzWckW_INZAI/edit',
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
    code: 'CAN-UDA-1-06',
    role: 'UDA',
    assetId: 'e685c451-af9f-40e4-970c-b014cce9060c',
    generationId: '7b438474-22ad-4f00-99af-c84701c8dfbe',
    sourceRevision: 'AIroW34njzpFPSBy_Xjby341iSQ7SmEBQR70BQLScoE5FV_KFk-vGnVI7MfqrlZg1zGOYYflxpjKiPkSkxnKJe4pYkfvQJB8fgMhxvVkGUM',
  },
  {
    code: 'CAN-PACK-1F',
    role: 'PACK',
    assetId: '2270facd-3b86-4b73-a0af-fa93377bea93',
    generationId: '3b884504-990b-4c70-a1a6-51439ad66894',
    sourceRevision: 'AIroW36BbFGL1-aa-8h5UPuYRCJBBvWiPf0wqDn1tBoiLiH-KQIYiOb5B9bQSgHobhEjCbMrSFbOuEZmhkhjLn4UyVnw0NGEyrLirYaSsYI',
  },
]

const APPROVAL = {
  decision: 'APPROVE' as const,
  approvedAt: '2026-08-23T09:42:00+02:00',
  reviewPackageId: 'HTC-REVIEW-PACKAGE:Prima:Prima:10:B28-B30:v1',
  improvementDisposition: 'SYSTEM_IMPROVEMENT_APPLIED' as const,
  improvementNote: 'La promozione sostituisce la crescita di file tranche-specifici con manifest dichiarativi e un registry runtime generico; inoltre rende obbligatoria la revisione di miglioramento prima delle future promozioni.',
}

const COMMON_SOURCES = [PLAN_PRIMA, UDA_106, PACK_1F]

const B28_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B28-PACK-v1',
  grade: 'Prima',
  blockId: 'B28',
  udaCode: '1-06',
  udaTitle: 'Informazioni, dati e sistemi digitali',
  packCode: 'CAN-PACK-1F',
  period: 'Aprile/Maggio',
  title: 'Dai dati all’informazione',
  durationMinutes: 120,
  why: 'Partire da una domanda concreta per capire quali dati servono e come renderli ordinabili prima di rappresentarli.',
  objective: 'Distinguere dato e informazione, individuare dati pertinenti e raccoglierli e classificarli con criteri espliciti.',
  outcomes: [
    'Riconoscere la differenza tra dato grezzo e informazione organizzata.',
    'Individuare dati utili rispetto a una domanda o a un problema.',
    'Classificare e ordinare dati secondo criteri espliciti.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Dalla domanda ai dati',
      instruction: 'La classe parte da una domanda circoscritta, per esempio il numero di oggetti realizzati con diversi materiali, i tempi di una semplice procedura o le preferenze tra soluzioni tecniche non personali. Si stabilisce che cosa osservare o contare e con quale criterio.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Raccogliere e classificare',
      instruction: 'Gli studenti registrano un piccolo insieme di dati, controllano che le categorie siano chiare e ordinano i valori in modo leggibile. Vengono segnalati dati mancanti, duplicati o incoerenti senza correggerli in modo nascosto.',
    },
  ],
  resources: [],
  evidence: 'Set dati ordinato.',
  observation: [
    'distingue correttamente dato e informazione;',
    'usa criteri coerenti di classificazione;',
    'organizza i dati in modo leggibile;',
  ],
  assessmentNote: 'Formativa: osserva pertinenza dei dati, coerenza delle categorie e leggibilità dell’insieme ordinato. Il set dati documenta il processo e non genera automaticamente un voto.',
  continuation: 'La lezione successiva organizza i dati in tabella, li rappresenta con un grafico e ricava informazioni supportate dai dati.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il compiler v2 ha assegnato in modo ordinato e stabile i passaggi 1 e 2 di CAN-PACK-1F a B28. Il Piano mantiene durata ed evidenza canonica; non vengono dedotti minuti interni.',
  },
  sources: COMMON_SOURCES,
}

const B29_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B29-PACK-v1',
  grade: 'Prima',
  blockId: 'B29',
  udaCode: '1-06',
  udaTitle: 'Informazioni, dati e sistemi digitali',
  packCode: 'CAN-PACK-1F',
  period: 'Aprile/Maggio',
  title: 'Tabelle, grafici e interpretazione',
  durationMinutes: 120,
  why: 'Trasformare un insieme di dati ordinato in una rappresentazione leggibile e usare la rappresentazione per ricavare informazioni verificabili.',
  objective: 'Rappresentare dati mediante una tabella e un grafico elementare e interpretare la rappresentazione ricavando informazioni supportate dai dati.',
  outcomes: [
    'Rappresentare dati mediante tabelle e grafici elementari.',
    'Interpretare semplici rappresentazioni di dati.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Dalla tabella al grafico',
      instruction: 'I dati vengono organizzati in una tabella semplice e trasformati in un grafico adatto, per esempio a barre, a colonne o a pittogrammi. Titolo, categorie e valori devono permettere la lettura senza spiegazioni aggiuntive. Gli studenti formulano almeno due informazioni ricavate dal grafico.',
    },
  ],
  resources: [],
  evidence: 'Tabella + grafico + interpretazione.',
  observation: [
    'costruisce o legge correttamente una semplice rappresentazione;',
    'comunica in modo chiaro ciò che ha ricavato dai dati.',
  ],
  assessmentNote: 'Formativa: controlla correttezza e leggibilità di tabella e grafico e verifica che le informazioni dichiarate siano effettivamente supportate dai dati. Nessun punteggio viene generato automaticamente.',
  continuation: 'La lezione successiva usa il modello input → elaborazione → output → memoria per leggere funzionalmente un sistema digitale e chiude l’UDA con restituzione e verifica.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il compiler v2 ha assegnato in modo ordinato e stabile il passaggio 3 di CAN-PACK-1F a B29. Il Piano mantiene durata ed evidenza canonica; non vengono dedotti minuti interni.',
  },
  sources: COMMON_SOURCES,
}

const B30_PROJECTION: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B30-PACK-v1',
  grade: 'Prima',
  blockId: 'B30',
  udaCode: '1-06',
  udaTitle: 'Informazioni, dati e sistemi digitali',
  packCode: 'CAN-PACK-1F',
  period: 'Aprile/Maggio',
  title: 'Sistema digitale: input, elaborazione, output, memoria',
  durationMinutes: 120,
  why: 'Collegare dati e informazioni al funzionamento di un sistema digitale semplice e rendere esplicite le funzioni di input, elaborazione, output e memoria.',
  objective: 'Riconoscere le funzioni essenziali di un sistema digitale, usarle in uno schema funzionale e documentare in modo responsabile il lavoro svolto sui dati.',
  outcomes: [
    'Riconoscere le componenti funzionali essenziali di un sistema digitale.',
    'Comprendere il ruolo di input, elaborazione, output e memoria.',
    'Usare in modo responsabile strumenti digitali scolastici per una consegna semplice.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Come funziona un sistema digitale',
      instruction: 'Attraverso esempi vicini all’esperienza degli alunni, come computer, tablet, termometro digitale o macchina fotografica digitale, si costruisce lo schema input → elaborazione → output → memoria e si associa ogni funzione a un componente o a un’azione.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Laboratorio e restituzione',
      instruction: 'Ogni coppia o gruppo completa la scheda «Dai dati all’informazione», produce tabella e grafico e aggiunge lo schema funzionale di un sistema digitale. Un compagno controlla se le conclusioni sono supportate dai dati e se lo schema funzionale è coerente.',
      resourceIds: ['STUDENT-DATA-INFO'],
    },
  ],
  resources: [
    {
      id: 'STUDENT-DATA-INFO',
      kind: 'STUDENT_SHEET',
      title: 'Dai dati all’informazione',
      instruction: 'Completa il dossier mantenendo visibile il passaggio dalla domanda ai dati e dalle rappresentazioni allo schema del sistema digitale.',
      surfaces: ['PREPARE'],
      prompts: [
        'Domanda di partenza',
        'Che cosa osservo o conto',
        'Categorie o criterio di classificazione',
        'Fonte o modalità di raccolta',
        'Tabella predisposta',
        'Grafico scelto',
        'Informazione 1 ricavata dai dati',
        'Informazione 2 ricavata dai dati',
        'Limiti o dati da controllare',
        'Sistema digitale osservato',
        'Input',
        'Elaborazione',
        'Output',
        'Memoria',
      ],
    },
  ],
  evidence: 'Schema funzionale + breve verifica.',
  observation: [
    'individua input, output e funzione di elaborazione;',
    'usa lo strumento digitale rispettando consegne e regole;',
    'comunica in modo chiaro ciò che ha ricavato dai dati.',
  ],
  assessmentNote: 'Conclusiva per UDA 1-06: integra schema funzionale e breve verifica individuale su dati, informazioni e funzioni essenziali del sistema digitale. La scheda documenta il percorso ma non sostituisce la prova né produce automaticamente un voto.',
  continuation: 'Con UDA 1-06 chiusa, il Piano passa al progetto tecnologico sostenibile finale.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Il compiler v2 ha assegnato in modo ordinato e stabile i passaggi 4 e 5 di CAN-PACK-1F a B30. La scheda è collegata al passaggio che la richiama esplicitamente; il Piano mantiene durata ed evidenza canonica.',
  },
  sources: COMMON_SOURCES,
}

function manifest(projection: HumanTaskLessonProjection): ApprovedHumanTaskManifest {
  return {
    schemaVersion: 1,
    recipeFamily: 'PACK_COMPOSED',
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

export const APPROVED_HUMAN_TASK_MANIFESTS: readonly ApprovedHumanTaskManifest[] = [
  manifest(B28_PROJECTION),
  manifest(B29_PROJECTION),
  manifest(B30_PROJECTION),
]
