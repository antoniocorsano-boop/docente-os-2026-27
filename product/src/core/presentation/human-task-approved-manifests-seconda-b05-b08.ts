import type {
  ApprovedHumanTaskCognitiveReceipt,
  ApprovedHumanTaskManifest,
  ApprovedHumanTaskSourceBinding,
} from './human-task-approved-manifest'
import type { HumanTaskContentSource, HumanTaskLessonProjection } from './human-task-content'

const SOURCES: HumanTaskContentSource[] = [
  {
    code: 'CAN-PLAN-2',
    label: 'Piano annuale operativo Tecnologia — classe seconda',
    role: 'PLAN',
    url: '/knowledge/36ef3be5-925f-4e28-afff-df11097827a9',
  },
  {
    code: 'CAN-UDA-2-02',
    label: 'Alimenti, trasformazione e conservazione',
    role: 'UDA',
    url: '/knowledge/1fd05883-3332-4f21-a7b3-2c4c531c0ae4',
  },
  {
    code: 'CAN-PACK-2B',
    label: 'Alimenti, trasformazione e conservazione — percorso operativo',
    role: 'PACK',
    url: '/knowledge/d8cb0142-3421-4f2e-a546-5e60b1822d7c',
  },
]

const SOURCE_BINDINGS: ApprovedHumanTaskSourceBinding[] = [
  {
    code: 'CAN-PLAN-2', role: 'PLAN', contribution: 'DIDACTIC',
    assetId: '36ef3be5-925f-4e28-afff-df11097827a9', generationId: 'a1066c0a-2720-40b0-841e-306cb998ce3e',
  },
  {
    code: 'CAN-UDA-2-02', role: 'UDA', contribution: 'DIDACTIC',
    assetId: '1fd05883-3332-4f21-a7b3-2c4c531c0ae4', generationId: '0d2ffe0d-222a-485b-ae23-1e91eb0072ab',
  },
  {
    code: 'CAN-PACK-2B', role: 'PACK', contribution: 'DIDACTIC',
    assetId: 'd8cb0142-3421-4f2e-a546-5e60b1822d7c', generationId: '5fbca577-3dcd-4609-a32e-f95a6d3ebc1d',
  },
]

const COGNITIVE_RECEIPT: ApprovedHumanTaskCognitiveReceipt = {
  status: 'SATISFIED',
  stakeholders: [
    {
      stakeholder: 'TEACHER',
      evidence: ['Ogni blocco espone focus, attività, prodotto, evidenza, scheda pertinente, preparazione, osservazione e continuazione.'],
      note: 'Il docente può preparare e condurre la lezione mantenendo distinto il focus tecnologico da eventuali approfondimenti specialistici non documentati.',
    },
    {
      stakeholder: 'LEARNER',
      evidence: ['Le schede 2B-1…2B-4 rendono espliciti consegna e prodotto; compito significativo, criteri OD-READY e rubrica rendono visibili qualità, controllo e miglioramento.'],
      note: 'L’alunno comprende cosa fare, cosa produrre, quali criteri usare e come motivare una scelta.',
    },
    {
      stakeholder: 'COORDINATION',
      evidence: ['Piano, UDA e PACK mantengono autorità distinte; le tre generazioni correnti e il timing di set sono congelati nel manifest.'],
      note: 'Il raccordo è professionalmente verificabile e preserva il confine disciplinare tecnologico.',
    },
    {
      stakeholder: 'GOVERNANCE',
      evidence: ['Approvazione umana registrata il 23 agosto 2026, review package, source binding e miglioramento del ciclo sono auditabili.'],
      note: 'La responsabilità della promozione resta umana; l’approvazione è circoscritta a Seconda B05-B08.',
    },
    {
      stakeholder: 'SYSTEM',
      evidence: ['DIRECT accetta il timing di set solo se N lezioni, M ore, cardinalità dei blocchi, ordine e campi operativi coincidono esattamente; ogni drift invalida il raccordo.'],
      note: 'L’automazione deriva soltanto campi documentati e si arresta se manca una condizione necessaria.',
    },
  ],
  note: 'Adempimento cognitivo verificato per tutti gli stakeholder di contesto di Seconda B05-B08.',
}

const COMMON = {
  grade: 'Seconda' as const,
  udaCode: '2-02',
  udaTitle: 'Alimenti, trasformazione e conservazione',
  packCode: 'CAN-PACK-2B',
  period: 'Ottobre/Novembre',
  durationMinutes: 120,
  assessmentNote: 'Valutazione formativa coerente con UDA 2-02: osservazioni sistematiche, elaborati, breve prova strutturata o orale e presentazione del prodotto. Il PACK fornisce criteri operativi e rubrica, senza generare automaticamente un voto.',
  sourceAlignment: {
    level: 'DIRECT' as const,
    note: 'CAN-PLAN-2 assegna collocazione, ordine e durata del segmento; CAN-UDA-2-02 assegna semantica e valutazione; CAN-PACK-2B documenta quattro lezioni 1:1 e dichiara esplicitamente il set “4 lezioni da 2 ore”.',
  },
  sources: SOURCES,
}

export const SECONDA_B05_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B05-v1',
  blockId: 'B05',
  title: 'Dal campo al prodotto',
  why: 'Leggere un alimento come esito di una filiera tecnologica, distinguendo materia prima, trasformazioni, confezionamento, distribuzione e consumo.',
  objective: 'Ricostruire una semplice filiera agroalimentare e distinguere materia prima e prodotto trasformato.',
  outcomes: ['Ordinare i passaggi essenziali della filiera.', 'Riconoscere fasi e attori.', 'Distinguere materia prima e prodotto trasformato.'],
  preparation: ['Tre o quattro alimenti comuni o relative immagini.', 'Scheda 2B-1.', 'Materiali per costruire un semplice diagramma di filiera.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'La storia tecnologica di un alimento',
    instruction: 'Parti da alimenti comuni e fai ricostruire produzione, raccolta o allevamento, trasformazione, confezionamento, distribuzione e consumo; gli alunni registrano i passaggi nella Scheda 2B-1 e costruiscono un diagramma di filiera leggibile.',
    resourceIds: ['SCHEDA-2B-1'],
  }],
  resources: [{
    id: 'SCHEDA-2B-1', kind: 'STUDENT_SHEET', title: 'La storia tecnologica di un alimento',
    instruction: 'Ricostruisci la filiera dell’alimento scelto dalla materia prima al consumo.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Alimento scelto.', 'Materia prima principale.', 'Dove e come viene prodotta.', 'Passaggi di trasformazione essenziali.', 'Conservazione.', 'Confezionamento.', 'Trasporto e distribuzione.', 'Consumo.', 'Scarti o rifiuti generati.', 'Una possibile miglioria della filiera.'],
  }],
  evidence: 'Scheda 2B-1 e diagramma di filiera: riconosce fasi e attori e distingue materia prima e prodotto trasformato.',
  observation: ['Ordina correttamente i passaggi essenziali.', 'Distingue materia prima e prodotto trasformato.', 'Rappresenta la filiera in modo comprensibile.'],
  continuation: 'La lezione successiva confronta le principali tecniche di conservazione e i relativi vantaggi e limiti.',
}

export const SECONDA_B06_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B06-v1',
  blockId: 'B06',
  title: 'Come si conserva un alimento',
  why: 'Confrontare tecniche di conservazione come processi tecnologici che rallentano il deterioramento mediante principi differenti.',
  objective: 'Associare metodi di conservazione, principio essenziale, vantaggi e limiti senza inventare dati non forniti dalle fonti.',
  outcomes: ['Riconoscere tecniche basate su freddo, calore, sottrazione d’acqua o confezionamento protettivo.', 'Associare metodo e principio essenziale.', 'Indicare un vantaggio e un limite del metodo considerato.'],
  preparation: ['Esempi reali o fotografici di alimenti conservati con tecniche diverse.', 'Scheda 2B-2.', 'Eventuali etichette o fonti fornite dal docente per dati puntuali.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'Metodo di conservazione: come funziona e perché',
    instruction: 'Classifica esempi e confronta refrigerazione o congelamento, pastorizzazione o sterilizzazione, essiccazione o disidratazione, salagione o zuccheraggio e confezionamento protettivo; registra metodo, principio, vantaggio, limite e comportamento corretto nella Scheda 2B-2.',
    resourceIds: ['SCHEDA-2B-2'],
  }],
  resources: [{
    id: 'SCHEDA-2B-2', kind: 'STUDENT_SHEET', title: 'Metodo di conservazione: come funziona e perché',
    instruction: 'Analizza un metodo di conservazione usando soltanto dati osservati o forniti.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Alimento o esempio.', 'Metodo.', 'Che cosa cambia o viene controllato.', 'Vantaggio principale.', 'Limite, costo o consumo di risorse.', 'Durata indicativa solo se fornita da fonte o etichetta, senza inventare valori.', 'Comportamento corretto del consumatore.'],
  }],
  evidence: 'Scheda 2B-2: associa metodo di conservazione, principio essenziale e vantaggio/limite.',
  observation: ['Associa correttamente metodo e principio.', 'Esplicita almeno un vantaggio e un limite.', 'Non introduce durate o dati tecnici non presenti nelle fonti.'],
  continuation: 'La lezione successiva legge packaging ed etichetta come componenti tecnologiche di protezione, informazione e fine vita.',
}

export const SECONDA_B07_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B07-v1',
  blockId: 'B07',
  title: 'Packaging, etichetta e consumo consapevole',
  why: 'Leggere l’imballaggio come componente tecnica che protegge, conserva, trasporta, comunica informazioni utili e genera un fine vita materiale.',
  objective: 'Collegare materiale, funzione, informazioni essenziali e fine vita di una confezione mantenendo il focus tecnologico.',
  outcomes: ['Individuare materiale e funzione del packaging.', 'Leggere informazioni essenziali e indicazioni di conservazione.', 'Collegare simboli di raccolta e fine vita al materiale.'],
  preparation: ['Confezioni pulite e sicure o immagini equivalenti.', 'Scheda 2B-3.', 'Due packaging confrontabili quando disponibili.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'Leggo una confezione',
    instruction: 'Analizza confezioni pulite e sicure distinguendo, quando pertinente, imballaggio primario e secondario; individua materiale, funzione, informazioni essenziali, simboli di raccolta, data e modalità di conservazione, quindi registra aspetti positivi, criticità e proposta di riduzione o semplificazione.',
    resourceIds: ['SCHEDA-2B-3'],
  }],
  resources: [{
    id: 'SCHEDA-2B-3', kind: 'STUDENT_SHEET', title: 'Leggo una confezione',
    instruction: 'Leggi la confezione come oggetto tecnico, non come esercizio di educazione nutrizionale specialistica.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Prodotto.', 'Materiale o materiali del packaging.', 'Funzione protettiva.', 'Informazioni utili presenti.', 'Indicazioni di conservazione.', 'Simboli di raccolta o fine vita.', 'Aspetti positivi.', 'Criticità.', 'Proposta di riduzione, riuso o semplificazione dell’imballaggio.'],
  }],
  evidence: 'Scheda 2B-3: legge informazioni essenziali e collega materiale, funzione e fine vita del packaging.',
  observation: ['Riconosce la funzione tecnica dell’imballaggio.', 'Individua informazioni essenziali pertinenti.', 'Collega materiale e fine vita senza spostare il compito su contenuti nutrizionali specialistici.'],
  continuation: 'La lezione successiva confronta filiere o soluzioni distributive usando criteri su durata, energia, trasporto, imballaggio e spreco.',
}

export const SECONDA_B08_PROJECTION: HumanTaskLessonProjection = {
  ...COMMON,
  projectionId: 'HTC-SECONDA-B08-v1',
  blockId: 'B08',
  title: 'Spreco, scelte e filiera responsabile',
  why: 'Usare criteri tecnici espliciti per confrontare filiere e motivare una scelta responsabile rispetto a conservazione, trasporto, packaging e spreco.',
  objective: 'Confrontare due filiere o soluzioni distributive e formulare un giudizio motivato usando almeno tre criteri.',
  outcomes: ['Applicare criteri espliciti di confronto.', 'Riconoscere relazioni tra energia, trasporto, packaging e spreco.', 'Motivare una scelta finale sulla base delle evidenze raccolte.'],
  preparation: ['Due filiere o soluzioni distributive confrontabili.', 'Scheda 2B-4.', 'Prodotti delle lezioni precedenti per collegare trasformazione, conservazione e packaging.'],
  steps: [{
    id: 'S01', minutes: 120, title: 'Quale filiera riduce meglio gli sprechi?',
    instruction: 'Confronta due filiere o soluzioni distributive con una matrice qualitativa basata su numero di passaggi, distanza o trasporto, energia per conservazione, durata, quantità di imballaggio, rischio di spreco e recuperabilità del packaging; concludi con una scelta motivata usando almeno tre criteri.',
    resourceIds: ['SCHEDA-2B-4'],
  }],
  resources: [{
    id: 'SCHEDA-2B-4', kind: 'STUDENT_SHEET', title: 'Confronto due filiere',
    instruction: 'Usa criteri espliciti e chiudi il confronto con una conclusione motivata.', surfaces: ['PREPARE', 'OBSERVE'],
    prompts: ['Numero di passaggi.', 'Distanza o trasporto.', 'Energia per conservazione.', 'Durata.', 'Quantità di imballaggio.', 'Rischio di spreco.', 'Possibilità di recupero o riciclo.', 'Attribuisci per ogni criterio un giudizio qualitativo: favorevole / intermedio / critico.', 'Conclusione: “Scelgo la filiera ___ perché…”.'],
  }],
  evidence: 'Scheda 2B-4 con matrice e conclusione: formula un giudizio motivato usando almeno tre criteri.',
  observation: ['Usa almeno tre criteri espliciti.', 'La conclusione è coerente con la matrice.', 'Collega la scelta a processi reali di filiera, conservazione, trasporto, packaging o spreco.'],
  continuation: 'Chiude UDA 2-02 e prepara il passaggio a territorio, città e pianificazione della UDA successiva.',
}

const PROJECTIONS = [SECONDA_B05_PROJECTION, SECONDA_B06_PROJECTION, SECONDA_B07_PROJECTION, SECONDA_B08_PROJECTION] as const

function manifest(projection: HumanTaskLessonProjection): ApprovedHumanTaskManifest {
  return {
    schemaVersion: 2,
    recipeFamily: 'DIRECT',
    timingSpecificity: 'FULL',
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
      decision: 'APPROVE',
      approvedAt: '2026-08-23T13:03:00+02:00',
      reviewPackageId: 'HTC-REVIEW-PACKAGE:Seconda:Seconda:2:B05-B08:v1',
      improvementDisposition: 'SYSTEM_IMPROVEMENT_APPLIED',
      improvementNote: 'Riutilizzata la separazione Piano=struttura, UDA=semantica/valutazione, PACK=operatività 1:1; il compiler supporta ora timing esplicito di set N lezioni da M ore con cardinalità e durata fail-closed.',
      cognitiveFulfillment: {
        ...COGNITIVE_RECEIPT,
        stakeholders: COGNITIVE_RECEIPT.stakeholders.map((item) => ({ ...item, evidence: [...item.evidence] })),
      },
    },
  }
}

export const APPROVED_HUMAN_TASK_MANIFESTS_SECONDA_B05_B08: readonly ApprovedHumanTaskManifest[] = PROJECTIONS.map(manifest)
