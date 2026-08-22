import type { HumanTaskLessonProjection } from './human-task-content'

const PLAN_PRIMA: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-PLAN-1',
  label: 'Piano annuale operativo Tecnologia — classe prima',
  role: 'PLAN',
  url: 'https://docs.google.com/document/d/1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4/edit',
}

const UDA_102: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-UDA-1-02',
  label: 'Materiali: dalla risorsa al prodotto',
  role: 'UDA',
  url: 'https://docs.google.com/document/d/1MziCI5IjvYjhHjU-rpe25ASMl48HlCQeh2FDIoJRROo/edit',
}

const UDA_103: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-UDA-1-03',
  label: 'Disegnare per comprendere e comunicare',
  role: 'UDA',
  url: 'https://docs.google.com/document/d/1E_IDcyTa43MYlyZE7wdowakF3royRfe69IGQR4xMx68/edit',
}

const PACK_1B: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-PACK-1B',
  label: 'Materiali e avvio al disegno tecnico per l’Open Day',
  role: 'PACK',
  url: 'https://docs.google.com/document/d/1QnrzAD1rHWwp97r-KPUuCC8XdFNXUFqMk5hi33GxuxQ/edit',
}

const PACK_1C: HumanTaskLessonProjection['sources'][number] = {
  code: 'CAN-PACK-1C',
  label: 'Micro-progetto Open Day — classe prima',
  role: 'PACK',
  url: 'https://docs.google.com/document/d/1WEzXGyizTuGQEqQT06MzJYvKTkPlD3nkN9aYKYbpl_4/edit',
}

const B11_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B11-v1',
  grade: 'Prima',
  blockId: 'B11',
  udaCode: '1-03',
  udaTitle: 'Disegnare per comprendere e comunicare',
  packCode: 'CAN-PACK-1B',
  period: 'Novembre/Dicembre',
  title: 'Entrare nel disegno tecnico',
  durationMinutes: 120,
  why: 'Aprire il linguaggio grafico-tecnico distinguendolo dal disegno libero e costruendo fin dall’inizio ordine, cura degli strumenti e leggibilità.',
  objective: 'Distinguere disegno libero, geometrico e tecnico e impostare correttamente un primo foglio usando gli strumenti fondamentali.',
  outcomes: [
    'Riconoscere funzione e uso di matita, righe, squadre, compasso e altri strumenti di base.',
    'Organizzare correttamente il foglio e lo spazio grafico.',
    'Distinguere disegno libero, geometrico e tecnico.',
  ],
  preparation: [],
  steps: [
    { id: 'S01', minutes: null, title: 'Differenza tra disegno libero, geometrico e tecnico', instruction: 'Differenza tra disegno libero, geometrico e tecnico.' },
    { id: 'S02', minutes: null, title: 'Strumenti', instruction: 'Strumenti.' },
    { id: 'S03', minutes: null, title: 'Postura', instruction: 'Postura.' },
    { id: 'S04', minutes: null, title: 'Impostazione del foglio', instruction: 'Impostazione del foglio.', resourceIds: ['STUDENT-H'] },
    { id: 'S05', minutes: null, title: 'Intestazione', instruction: 'Intestazione.' },
    { id: 'S06', minutes: null, title: 'Qualità e funzione della linea', instruction: 'Qualità e funzione della linea.' },
  ],
  resources: [
    {
      id: 'STUDENT-H',
      kind: 'STUDENT_SHEET',
      title: 'Il mio primo foglio tecnico',
      instruction: 'Usa questa scheda nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Riquadro semplice',
        'Intestazione',
        'Esercizio su linee orizzontali, verticali, inclinate',
        'Coppie di parallele',
        'Coppie di perpendicolari',
        'Breve autoverifica: precisione / pulizia / completezza',
      ],
    },
  ],
  evidence: 'Uso degli strumenti, ordine, precisione, rispetto delle consegne.',
  observation: [
    'Scelta e uso appropriato degli strumenti.',
    'Ordine e leggibilità della tavola.',
    'Uso corretto del lessico geometrico-tecnico.',
  ],
  assessmentNote: 'Formativa: osserva uso degli strumenti, ordine del foglio, leggibilità e lessico. La prima tavola documenta il punto di partenza e non genera automaticamente un voto.',
  continuation: 'La lezione successiva passa alle costruzioni fondamentali e al controllo dell’errore.',
  sourceAlignment: { level: 'DIRECT' },
  sources: [PLAN_PRIMA, UDA_103, PACK_1B],
}

const B12_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B12-v1',
  grade: 'Prima',
  blockId: 'B12',
  udaCode: '1-03',
  udaTitle: 'Disegnare per comprendere e comunicare',
  packCode: 'CAN-PACK-1B',
  period: 'Novembre/Dicembre',
  title: 'Costruzioni fondamentali e controllo dell’errore',
  durationMinutes: 120,
  why: 'Passare dall’impostazione del foglio a procedure geometriche controllabili, facendo dell’errore un elemento da riconoscere e correggere.',
  objective: 'Eseguire costruzioni di base seguendo una sequenza e confrontare un procedimento corretto con un risultato approssimativo.',
  outcomes: [
    'Tracciare linee parallele, perpendicolari e inclinate.',
    'Costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane.',
  ],
  preparation: [],
  steps: [
    { id: 'S01', minutes: null, title: 'Segmenti, perpendicolari, parallele, asse di un segmento', instruction: 'Segmenti, perpendicolari, parallele, asse di un segmento.' },
    { id: 'S02', minutes: null, title: 'Esercitazione graduata', instruction: 'Esercitazione graduata.' },
    { id: 'S03', minutes: null, title: 'Confronto tra procedura corretta e risultato approssimativo', instruction: 'Confronto tra procedura corretta e risultato approssimativo.' },
  ],
  resources: [],
  evidence: 'Sequenza, precisione, capacità di correggere.',
  observation: [
    'Rispetto della sequenza operativa.',
    'Precisione di linee, intersezioni e costruzioni.',
    'Capacità di riconoscere e correggere errori.',
  ],
  assessmentNote: 'Formativa: osserva rispetto della sequenza, precisione delle costruzioni e capacità di riconoscere o correggere errori. La tavola non genera automaticamente un voto.',
  continuation: 'Il percorso si raccorda ora al micro-progetto trasversale senza attribuire ore formali alle UDA progettuali successive.',
  sourceAlignment: { level: 'DIRECT' },
  sources: [PLAN_PRIMA, UDA_103, PACK_1B],
}

const B13_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B13-PACK-v1',
  grade: 'Prima',
  blockId: 'B13',
  udaCode: '1-02',
  udaTitle: 'Materiali: dalla risorsa al prodotto',
  packCode: 'CAN-PACK-1B',
  period: 'Novembre/Dicembre',
  title: 'Materiali, requisiti e micro-progetto trasversale',
  durationMinutes: 120,
  why: 'Usare ciò che la classe ha imparato sui materiali dentro un problema concreto, senza anticipare formalmente l’intera UDA sul processo progettuale.',
  objective: 'Definire un problema semplice, esplicitare requisiti e vincoli e produrre due soluzioni confrontabili indicando il materiale principale.',
  outcomes: [
    'Descrivere alcune proprietà fisiche, meccaniche, tecnologiche e funzionali con esempi concreti.',
    'Motivare la scelta di un materiale in rapporto a funzione, proprietà, costo, disponibilità, sicurezza e impatto ambientale.',
    'Documentare un’attività con tabella, schema, breve relazione o supporto digitale.',
  ],
  preparation: [],
  steps: [
    { id: 'S01', minutes: null, title: 'Individuare il problema', instruction: 'Individuare il problema.', resourceIds: ['PROJECT-PROBLEM'] },
    { id: 'S02', minutes: null, title: 'Definire requisiti e vincoli', instruction: 'Definire requisiti e vincoli.', resourceIds: ['PROJECT-REQ'] },
    { id: 'S03', minutes: null, title: 'Produrre due idee', instruction: 'Produrre due idee.', resourceIds: ['PROJECT-IDEAS'] },
  ],
  resources: [
    {
      id: 'PROJECT-PROBLEM',
      kind: 'STUDENT_SHEET',
      title: 'Il problema',
      instruction: 'Usa questa risorsa nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Dove nasce il problema?',
        'Chi lo incontra?',
        'Che cosa rende difficile fare bene quella attività?',
        'Quale bisogno vogliamo soddisfare?',
        'Scrivi il problema in una frase: “Abbiamo bisogno di…”',
        'Come sapremo che la soluzione funziona?',
      ],
    },
    {
      id: 'PROJECT-REQ',
      kind: 'STUDENT_SHEET',
      title: 'Requisiti',
      instruction: 'Usa questa risorsa nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Essere utile',
        'Essere stabile e sicura',
        'Essere realizzabile con materiali semplici',
        'Usare poco materiale',
        'Poter essere spiegata con un disegno',
        'Essere verificabile con una prova semplice',
        'Considerare riuso, riciclabilità o riduzione dello spreco',
        'Aggiungere 2–4 requisiti specifici del progetto',
        'Indicare i vincoli: dimensioni indicative, materiali disponibili, tempo, strumenti consentiti, eventuale lavoro in gruppo',
      ],
    },
    {
      id: 'PROJECT-IDEAS',
      kind: 'STUDENT_SHEET',
      title: 'Due soluzioni possibili',
      instruction: 'Usa questa risorsa nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Idea A: piccolo schizzo + descrizione',
        'Idea B: piccolo schizzo + descrizione',
        'Vantaggi',
        'Limiti',
        'Materiale principale',
        'Facilità di realizzazione',
        'Comportamento a fine vita',
      ],
    },
  ],
  evidence: 'Il problema + Requisiti + Due soluzioni possibili',
  observation: [
    'Collega proprietà e funzione.',
    'Motiva una scelta fra alternative.',
    'Collabora e documenta il lavoro.',
  ],
  assessmentNote: 'Formativa: osserva la coerenza tra problema, requisiti, alternative e motivazioni sui materiali. Il micro-progetto resta un raccordo interno a UDA 1-02 e non genera automaticamente un voto autonomo.',
  continuation: 'La lezione successiva confronta le alternative, seleziona una soluzione e la sottopone a una prova semplice.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Le ore restano contabilizzate in UDA 1-02. Il micro-progetto usa qui soltanto problema, requisiti e due idee da CAN-PACK-1C; il pacchetto non viene trattato come una nuova UDA né come otto ore aggiuntive.',
  },
  sources: [PLAN_PRIMA, UDA_102, PACK_1C],
}

const B14_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B14-PACK-v1',
  grade: 'Prima',
  blockId: 'B14',
  udaCode: '1-02',
  udaTitle: 'Materiali: dalla risorsa al prodotto',
  packCode: 'CAN-PACK-1B',
  period: 'Novembre/Dicembre',
  title: 'Confronto, scelta e prova del micro-progetto',
  durationMinutes: 120,
  why: 'Trasformare il confronto sui materiali in una decisione verificabile, usando un prototipo semplice o una simulazione come mezzo di prova e non come lavoretto fine a se stesso.',
  objective: 'Scegliere una soluzione con criteri espliciti, realizzare o simulare un prototipo semplice e documentare una prova collegata ai requisiti.',
  outcomes: [
    'Eseguire semplici prove comparative in condizioni controllate.',
    'Motivare la scelta di un materiale in rapporto a funzione, proprietà, costo, disponibilità, sicurezza e impatto ambientale.',
    'Documentare un’attività con tabella, schema, breve relazione o supporto digitale.',
  ],
  preparation: [],
  steps: [
    { id: 'S01', minutes: null, title: 'Scegliere con criteri', instruction: 'Scegliere con criteri.', resourceIds: ['PROJECT-CHOICE'] },
    {
      id: 'S02',
      minutes: null,
      title: 'Realizzare il prototipo',
      instruction: 'Il prototipo può essere in cartoncino, carta, cartone ondulato, legno leggero solo se lavorabile in sicurezza con strumenti ammessi, materiali recuperati puliti e altri materiali semplici preventivamente autorizzati. Criterio guida: non deve essere un “lavoretto”, ma una soluzione coerente con il progetto documentato.',
    },
    { id: 'S03', minutes: null, title: 'Provare', instruction: 'Provare.', resourceIds: ['PROJECT-TEST'] },
  ],
  resources: [
    {
      id: 'PROJECT-CHOICE',
      kind: 'STUDENT_SHEET',
      title: 'Matrice di scelta',
      instruction: 'Usa questa risorsa nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Utilità',
        'Stabilità/sicurezza',
        'Semplicità costruttiva',
        'Disponibilità dei materiali',
        'Uso contenuto di materia',
        'Possibilità di riuso/riciclo',
        'Qualità della forma',
        'Somma dei punteggi e scelta finale',
        'Scegliamo l’idea ___ perché…',
      ],
    },
    {
      id: 'PROJECT-TEST',
      kind: 'STUDENT_SHEET',
      title: 'La prova',
      instruction: 'Usa questa risorsa nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.',
      surfaces: ['PREPARE'],
      prompts: [
        'Che cosa vogliamo verificare?',
        'Come facciamo la prova?',
        'Che cosa osserviamo o misuriamo?',
        'Il requisito è rispettato? Sì / parzialmente / no',
        'Quale difetto emerge?',
      ],
    },
  ],
  evidence: 'Matrice di scelta + La prova',
  observation: [
    'Esegue una procedura rispettando consegne e sicurezza.',
    'Motiva una scelta fra alternative.',
    'Collabora e documenta il lavoro.',
  ],
  assessmentNote: 'Formativa e prestazionale: osserva coerenza della scelta, rispetto delle consegne e capacità di documentare la prova. La chiusura di UDA 1-02 usa le evidenze raccolte senza duplicare automaticamente la valutazione.',
  continuation: 'Il primo periodo prosegue con una composizione geometrica controllata e la restituzione Open Day collegata a UDA 1-03.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'Le ore restano UDA 1-02. Sono selezionati soltanto scelta, prototipo e prova da CAN-PACK-1C; la durata complessiva del pacchetto non viene trasferita al blocco e i singoli passaggi restano senza minuti inventati.',
  },
  sources: [PLAN_PRIMA, UDA_102, PACK_1C],
}

const B15_PRIMA: HumanTaskLessonProjection = {
  projectionId: 'HTC-PRIMA-B15-PACK-v1',
  grade: 'Prima',
  blockId: 'B15',
  udaCode: '1-03',
  udaTitle: 'Disegnare per comprendere e comunicare',
  packCode: 'CAN-PACK-1B',
  period: 'Novembre/Dicembre',
  title: 'Composizione geometrica e restituzione Open Day',
  durationMinutes: 120,
  why: 'Usare una composizione geometrica controllata come evidenza di comunicazione tecnica e collegarla a una restituzione orale breve del percorso svolto.',
  objective: 'Costruire una composizione geometrica rispettando consegne e misure e preparare un pitch breve che renda comprensibile il processo.',
  outcomes: [
    'Organizzare correttamente il foglio e lo spazio grafico.',
    'Costruire segmenti, angoli, bisettrici, assi e principali figure geometriche piane.',
    'Effettuare semplici misurazioni e riportare misure in modo ordinato.',
  ],
  preparation: [],
  steps: [
    {
      id: 'S01',
      minutes: null,
      title: 'Costruzione di una semplice composizione geometrica vincolata',
      instruction: 'Costruzione di una semplice composizione geometrica vincolata da misure/consegne.',
    },
    {
      id: 'S02',
      minutes: null,
      title: 'Prima riflessione su requisiti e vincoli',
      instruction: 'Prima riflessione su requisiti e vincoli.',
    },
    { id: 'S03', minutes: null, title: 'Pitch Open Day', instruction: 'Pitch Open Day.', resourceIds: ['OPEN-DAY-PITCH'] },
  ],
  resources: [
    {
      id: 'OPEN-DAY-PITCH',
      kind: 'TASK_BRIEF',
      title: 'Pitch Open Day',
      instruction: 'Usa questa traccia nel passaggio indicato senza aggiungere requisiti non presenti nella fonte.',
      surfaces: ['PREPARE'],
      prompts: [
        'Il problema che abbiamo osservato è…',
        'Avevamo due idee…',
        'Abbiamo scelto questa perché…',
        'Il materiale principale è… perché…',
        'Questa è la tavola del progetto…',
        'Abbiamo provato il prototipo facendo…',
        'La cosa che miglioreremmo è…',
        'La nostra scelta di sostenibilità è…',
      ],
    },
  ],
  evidence: 'TAVOLA L — Composizione geometrica controllata. + Pitch Open Day',
  observation: [
    'Precisione di linee, intersezioni e costruzioni.',
    'Ordine e leggibilità della tavola.',
    'Uso corretto del lessico geometrico-tecnico.',
  ],
  assessmentNote: 'Formativa: osserva precisione, leggibilità e capacità di spiegare il percorso con lessico tecnico. Lo stato Open Day resta una classificazione espositiva e non diventa automaticamente un voto.',
  continuation: 'Dopo il gate del primo periodo il percorso di disegno tecnico riprende con segmenti, angoli, assi e bisettrici.',
  sourceAlignment: {
    level: 'COMPOSED',
    note: 'CAN-PACK-1B fornisce la composizione geometrica e CAN-PACK-1C la traccia di pitch. CAN-PACK-1D resta previsto dal Piano soltanto come regia logistica e non alimenta questa vista didattica.',
  },
  sources: [PLAN_PRIMA, UDA_103, PACK_1B, PACK_1C],
}

export const APPROVED_HUMAN_TASK_PROJECTIONS_B11_B15: readonly HumanTaskLessonProjection[] = [
  B11_PRIMA,
  B12_PRIMA,
  B13_PRIMA,
  B14_PRIMA,
  B15_PRIMA,
]
