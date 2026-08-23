import type { HumanTaskLessonProjection } from './human-task-content'

const PLAN_PRIMA: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-PLAN-1',
  label: 'Piano annuale operativo Tecnologia — classe prima',
  role: 'PLAN',
  url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
}

const UDA_104: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-UDA-1-04',
  label: 'Rifiuti, recupero ed economia circolare',
  role: 'UDA',
  url: 'https://docs.google.com/document/d/1TuQJm76gQ_n7PmhwnfendCYe-QwBQV1QmZI0BiFZiWw/edit',
}

const PACK_1E: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-PACK-1E',
  label: 'Dallo scarto alla nuova risorsa',
  role: 'PACK',
  url: 'https://docs.google.com/document/d/1Ufs7qFo3HcdKqgZb8hKNm9r29vSl_eKPAi5w1BTvBGQ/edit',
}

const B20_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B20-PLAN-v1',
  grade: 'Prima',
  blockId: 'B20',
  udaCode: '1-04',
  udaTitle: 'Rifiuti, recupero ed economia circolare',
  packCode: 'CAN-PACK-1E',
  period: 'Gennaio/Febbraio',
  title: 'Dal prodotto al rifiuto',
  durationMinutes: 120,
  why: 'Far capire che il ciclo tecnologico continua dopo l’uso del prodotto e che le diverse scelte di fine vita non sono equivalenti.',
  objective: 'Riconoscere quando un prodotto diventa rifiuto e distinguere riduzione, riuso, recupero, riciclo e smaltimento in casi semplici.',
  outcomes: [
    'riconoscere le principali tipologie di rifiuto in relazione al materiale di origine;',
    'distinguere prevenzione, riduzione, riuso, recupero, riciclo e smaltimento;',
    'individuare comportamenti di consumo responsabile applicabili alla vita quotidiana;',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Dal prodotto al rifiuto',
      instruction: 'Richiamo dell’UDA sui materiali. Osservazione di oggetti e imballaggi. Individuazione delle condizioni in cui un prodotto diventa rifiuto. Discussione guidata sul concetto di fine vita.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Ridurre, riusare, recuperare, riciclare',
      instruction: 'Costruzione condivisa del lessico essenziale. Classificazione di esempi reali. Confronto tra azioni diverse e riflessione sulla gerarchia delle scelte.',
    },
  ],
  resources: [],
  evidence: 'Classificazione e schema iniziale.',
  observation: [
    'Classifica correttamente materiali e rifiuti in situazioni note.',
    'Distingue riuso, recupero, riciclo e smaltimento.',
    'Motiva comportamenti di riduzione degli sprechi.',
  ],
  assessmentNote: 'Formativa: osserva la correttezza della classificazione, il lessico essenziale e la capacità di motivare semplici scelte di riduzione o riuso. Non trasformare automaticamente la classificazione in voto.',
  continuation: 'La lezione successiva ricostruisce una filiera di recupero e confronta modello lineare ed economia circolare.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 assegna B20 alle prime due ore di UDA 1-04. Le Fasi 1 e 2 durano un’ora ciascuna e coprono esattamente il blocco.',
  },
  sources: [PLAN_PRIMA, UDA_104],
}

const B21_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B21-PLAN-v1',
  grade: 'Prima',
  blockId: 'B21',
  udaCode: '1-04',
  udaTitle: 'Rifiuti, recupero ed economia circolare',
  packCode: 'CAN-PACK-1E',
  period: 'Gennaio/Febbraio',
  title: 'Filiera di recupero ed economia circolare',
  durationMinutes: 120,
  why: 'Passare dalla classificazione dei rifiuti alla comprensione del percorso tecnologico che può riportare materia recuperata dentro un nuovo ciclo produttivo.',
  objective: 'Ricostruire una filiera di recupero in forma semplificata e confrontare il modello lineare con un modello circolare usando uno schema leggibile.',
  outcomes: [
    'ricostruire in forma schematica il percorso di un materiale dopo l’uso;',
    'confrontare il modello lineare di produzione e consumo con il modello circolare;',
    'raccogliere, classificare e rappresentare semplici dati relativi ai rifiuti;',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Come funziona una filiera di recupero',
      instruction: 'Ricostruzione semplificata del percorso di carta, vetro, metallo, plastica o altro materiale significativo. Schema input-processo-output e individuazione delle trasformazioni principali.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Dal modello lineare al modello circolare',
      instruction: 'Confronto tra “estrai-produci-usa-getta” e “riduci-riusa-recupera-ricicla”. Costruzione di un diagramma circolare e discussione sugli effetti ambientali delle diverse scelte.',
    },
  ],
  resources: [],
  evidence: 'Diagramma circolare + dati essenziali.',
  observation: [
    'Ricostruisce il percorso essenziale di un materiale dopo l’uso.',
    'Riconosce il principio di circolarità.',
    'Utilizza dati e informazioni pertinenti.',
  ],
  assessmentNote: 'Formativa: osserva coerenza del percorso ricostruito, riconoscimento del principio di circolarità e uso pertinente dei dati. Il diagramma è evidenza del ragionamento, non un voto automatico.',
  continuation: 'La lezione successiva applica il percorso a tre-cinque oggetti o imballaggi e chiude UDA 1-04 con dossier, verifica e autovalutazione.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 assegna B21 alle Fasi 3 e 4 di UDA 1-04. Le due fasi da un’ora coprono esattamente il blocco.',
  },
  sources: [PLAN_PRIMA, UDA_104],
}

const B22_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B22-PLAN-v1',
  grade: 'Prima',
  blockId: 'B22',
  udaCode: '1-04',
  udaTitle: 'Rifiuti, recupero ed economia circolare',
  packCode: 'CAN-PACK-1E',
  period: 'Gennaio/Febbraio',
  title: 'Dallo scarto alla nuova risorsa',
  durationMinutes: 120,
  why: 'Applicare i concetti dell’UDA a oggetti reali e trasformare una scelta di fine vita in una decisione motivata, documentata e comunicabile.',
  objective: 'Analizzare tre-cinque oggetti o imballaggi, documentarne materiale, fine vita, possibile riuso o recupero e motivare almeno una scelta per ridurre lo spreco.',
  outcomes: [
    'leggere semplici simboli e indicazioni presenti su imballaggi e contenitori;',
    'ricostruire in forma schematica il percorso di un materiale dopo l’uso;',
    'individuare comportamenti di consumo responsabile applicabili alla vita quotidiana;',
    'motivare una scelta di riduzione, riuso o riciclo con argomentazioni tecniche elementari.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Laboratorio di analisi',
      instruction: 'Analisi di prodotti e imballaggi. Raccolta di dati, lettura di simboli, classificazione dei materiali, individuazione delle possibilità di recupero. Preparazione del prodotto finale.',
      resourceIds: ['STUDENT-CIRCULAR-LIFE'],
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Compito significativo e verifica',
      instruction: 'Completamento e presentazione della scheda “Dallo scarto alla nuova risorsa”. Breve prova individuale di verifica e autovalutazione.',
      resourceIds: ['STUDENT-CIRCULAR-LIFE'],
    },
  ],
  resources: [
    {
      id: 'STUDENT-CIRCULAR-LIFE',
      kind: 'STUDENT_SHEET',
      title: 'Dallo scarto alla nuova risorsa',
      instruction: 'Usa questa scheda nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Oggetto o imballaggio: ____________________',
        'Funzione: ____________________',
        'Materiale o materiali prevalenti: ____________________',
        'Quando diventa rifiuto: ____________________',
        'Modalità di raccolta o conferimento verificata: ____________________',
        'Possibile riuso: ____________________',
        'Recupero o riciclo ipotizzato: ____________________',
        'Percorso circolare: ____________________',
        'Azione utile per prevenire o ridurre il rifiuto: ____________________',
        'Motivazione della scelta: ____________________',
      ],
    },
  ],
  evidence: 'Scheda/dossier + breve verifica.',
  observation: [
    'Classifica correttamente materiali e rifiuti in situazioni note.',
    'Ricostruisce il percorso essenziale di un materiale dopo l’uso.',
    'Utilizza dati e informazioni pertinenti.',
    'Motiva comportamenti di riduzione degli sprechi.',
    'Collabora nel lavoro di gruppo rispettando consegne e ruoli.',
  ],
  assessmentNote: 'Conclusiva per UDA 1-04: usa dossier, breve prova e osservazioni raccolte. Le regole territoriali di conferimento vanno considerate valide solo dopo verifica su una fonte istituzionale aggiornata; l’autovalutazione resta distinta dal voto.',
  continuation: 'Con UDA 1-04 chiusa, il Piano passa al processo progettuale autonomo di UDA 1-05.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PLAN-1 assegna B22 alle Fasi 5 e 6 di UDA 1-04. Le due fasi da un’ora coprono esattamente il blocco. CAN-PACK-1E fornisce soltanto la scheda operativa e non determina la scansione temporale.',
  },
  sources: [PLAN_PRIMA, UDA_104, PACK_1E],
}

export const APPROVED_HUMAN_TASK_PROJECTIONS_B20_B22: readonly HumanTaskLessonProjection[] = [
  B20_PRIMA,
  B21_PRIMA,
  B22_PRIMA,
]
